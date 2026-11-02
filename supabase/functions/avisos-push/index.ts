// Avisos push al celular o la compu, aunque la app esté cerrada.
// - La app pide la clave pública ("clave"), se suscribe y guarda la suscripción ("suscribir").
// - La base llama a "enviar" (triggers con pg_net) cuando hay una notificación o un mensaje de chat nuevo.
// - "probar" le manda un aviso de prueba a los dispositivos de quien lo pide.
// Las claves VAPID se generan solas la primera vez y quedan en push_config (sólo la ve el servicio).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aBase64Url, enviarPush, generarClavesVapid, type ClavesVapid, type Suscripcion } from "../_shared/web-push.ts";
import { datosPush, endpointPermitido, type AvisoPush } from "../_shared/push-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-push-secreto, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const CONTACTO = "https://totalrh.com.ar";

interface Config {
  vapid_publica: string;
  vapid_privada: JsonWebKey;
  secreto: string;
}

async function configuracion(admin: SupabaseClient): Promise<Config> {
  const leer = () => admin.from("push_config").select("vapid_publica, vapid_privada, secreto").eq("id", 1).maybeSingle();
  const { data } = await leer();
  if (data) return data as Config;
  const claves = await generarClavesVapid();
  await admin.from("push_config").upsert({
    id: 1,
    vapid_publica: claves.publica,
    vapid_privada: claves.privada,
    secreto: aBase64Url(crypto.getRandomValues(new Uint8Array(32))),
    url_funcion: `${Deno.env.get("SUPABASE_URL")}/functions/v1/avisos-push`,
    clave_anon: Deno.env.get("SUPABASE_ANON_KEY"),
  }, { onConflict: "id", ignoreDuplicates: true });
  // Si dos pedidos llegaron juntos, queda la del primero
  const { data: guardada, error } = await leer();
  if (error || !guardada) throw new Error("No se pudo preparar los avisos push");
  return guardada as Config;
}

function mismoTexto(a: string, b: string) {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

/** Envía el aviso a todos los dispositivos de esas personas y borra los que el navegador dio de baja. */
async function avisar(admin: SupabaseClient, cfg: Config, usuarios: string[], aviso: AvisoPush & { siempre?: boolean }) {
  if (!usuarios.length) return { enviados: 0, fallidos: 0 };
  const { data: subs } = await admin.from("push_suscripciones").select("id, endpoint, p256dh, auth").in("user_id", usuarios);
  const claves: ClavesVapid = { publica: cfg.vapid_publica, privada: cfg.vapid_privada };
  let enviados = 0;
  let fallidos = 0;
  const vencidas: string[] = [];
  await Promise.all((subs ?? []).map(async (s: Suscripcion & { id: string }) => {
    try {
      const r = await enviarPush(s, aviso, claves, CONTACTO);
      if (r.ok) enviados++;
      else {
        fallidos++;
        if (r.vencida) vencidas.push(s.id);
        else console.error("push rechazado", r.status, new URL(s.endpoint).hostname);
      }
    } catch (e) {
      fallidos++;
      console.error("push sin enviar", e instanceof Error ? e.message : e);
    }
  }));
  if (vencidas.length) await admin.from("push_suscripciones").delete().in("id", vencidas);
  return { enviados, fallidos };
}

async function nombreDe(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("empleados").select("nombre, apellido").eq("user_id", userId).limit(1).maybeSingle();
  if (data) return `${data.nombre ?? ""} ${data.apellido ?? ""}`.trim();
  const { data: u } = await admin.auth.admin.getUserById(userId);
  return u.user?.email?.split("@")[0] ?? null;
}

/** Lo que llama la base cuando se inserta una notificación o un mensaje de chat. */
async function enviar(admin: SupabaseClient, cfg: Config, tabla: string, id: string) {
  if (tabla === "notificaciones") {
    const { data: n } = await admin.from("notificaciones").select("id, user_id, titulo, mensaje, link").eq("id", id).maybeSingle();
    if (!n) return { enviados: 0, fallidos: 0 };
    return avisar(admin, cfg, [n.user_id], datosPush.notificacion(n));
  }
  if (tabla === "chat_mensajes") {
    const { data: m } = await admin.from("chat_mensajes")
      .select("id, conversacion_id, autor_id, contenido, adjunto_tipo, eliminado").eq("id", id).maybeSingle();
    if (!m || m.eliminado) return { enviados: 0, fallidos: 0 };
    const [{ data: partes }, { data: conv }, autor] = await Promise.all([
      admin.from("chat_participantes").select("user_id").eq("conversacion_id", m.conversacion_id),
      admin.from("chat_conversaciones").select("tipo, nombre").eq("id", m.conversacion_id).maybeSingle(),
      nombreDe(admin, m.autor_id),
    ]);
    const destinos = (partes ?? []).map((p: { user_id: string }) => p.user_id).filter((u: string) => u !== m.autor_id);
    const grupo = conv?.tipo !== "directa" && conv?.nombre ? conv.nombre : null;
    return avisar(admin, cfg, destinos, datosPush.chat(m, autor, grupo));
  }
  return { enviados: 0, fallidos: 0 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const cfg = await configuracion(admin);

    // Llamado desde la base: se valida con el secreto de push_config
    if (body.action === "enviar") {
      const secreto = req.headers.get("x-push-secreto") ?? "";
      if (!mismoTexto(secreto, cfg.secreto)) return json({ error: "No autorizado" }, 401);
      return json(await enviar(admin, cfg, String(body.tabla ?? ""), String(body.id ?? "")));
    }

    // El resto lo pide la app con la sesión del usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);
    const cliente = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await cliente.auth.getUser();
    if (!user) return json({ error: "No autorizado" }, 401);

    if (body.action === "clave") return json({ clave: cfg.vapid_publica });

    if (body.action === "suscribir") {
      const { endpoint, p256dh, auth } = body as Record<string, string>;
      if (!endpoint || !p256dh || !auth || !endpointPermitido(endpoint)) return json({ error: "Suscripción inválida" }, 400);
      // Si el celular era de otra cuenta, ahora avisa a la que inició sesión
      const { error } = await admin.from("push_suscripciones").upsert({
        user_id: user.id, endpoint, p256dh, auth,
        dispositivo: (req.headers.get("user-agent") ?? "").slice(0, 200),
        actualizada_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (error) throw error;
      return json({ ok: true });
    }

    if (body.action === "probar") {
      const r = await avisar(admin, cfg, [user.id], {
        titulo: "Aviso de prueba", cuerpo: "Si ves esto, los avisos llegan a este dispositivo.",
        url: "/muro", etiqueta: "prueba", siempre: true,
      });
      return json(r);
    }

    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Error inesperado" }, 500);
  }
});
