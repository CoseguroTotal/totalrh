import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ESPERA_REFICHAR_SEG, UMBRAL_DUPLICADO, distanciaMinima, esDescriptorValido, fechaArgentina,
  mejorCoincidencia, muestrasConsistentes, type Descriptor,
} from "../_shared/face-match.ts";
import { puedeOperarTerminal, puedeRegistrarRostro } from "../_shared/attendance-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, empleado_id, codigo } = body;

    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const usuarioAutenticado = async () => {
      const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (!jwt) return null;
      const { data } = await supabaseAdmin.auth.getUser(jwt);
      return data?.user ?? null;
    };

    const rolesDe = async (userId: string) => {
      const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
      return new Set((data ?? []).map((r: { role: string }) => r.role));
    };

    // ── Action: face-enroll — registrar la plantilla facial de un empleado ──
    if (action === "face-enroll") {
      const user = await usuarioAutenticado();
      if (!user) return json({ error: "Debés iniciar sesión" }, 401);

      const { descriptores, consentimiento_texto } = body;
      if (!empleado_id || typeof empleado_id !== "string") return json({ error: "empleado_id requerido" }, 400);
      if (typeof consentimiento_texto !== "string" || consentimiento_texto.length < 20) {
        return json({ error: "Falta el consentimiento del empleado" }, 400);
      }
      if (!Array.isArray(descriptores) || descriptores.length < 1 || descriptores.length > 5 || !descriptores.every(esDescriptorValido)) {
        return json({ error: "Muestras faciales inválidas" }, 400);
      }
      if (!muestrasConsistentes(descriptores as Descriptor[])) {
        return json({ error: "Las capturas no coinciden entre sí. Probá de nuevo con buena luz y mirando a la cámara." }, 422);
      }

      const { data: emp } = await supabaseAdmin
        .from("empleados")
        .select("id, user_id, estado")
        .eq("id", empleado_id)
        .maybeSingle();
      if (!emp) return json({ error: "Empleado no encontrado" }, 404);

      if (!puedeRegistrarRostro(user.id, emp.user_id, await rolesDe(user.id))) {
        return json({ error: "No tenés permiso para registrar el rostro de otro empleado" }, 403);
      }

      // Evitar que la misma cara quede asociada a dos legajos distintos
      const { data: otros } = await supabaseAdmin
        .from("rostros_empleados")
        .select("empleado_id, descriptores")
        .neq("empleado_id", empleado_id);
      for (const o of otros ?? []) {
        const muestras = (o.descriptores as Descriptor[]).filter(esDescriptorValido);
        if ((descriptores as Descriptor[]).some((d) => distanciaMinima(d, muestras) < UMBRAL_DUPLICADO)) {
          return json({ error: "Este rostro ya está registrado en otro legajo. Consultá con RRHH." }, 409);
        }
      }

      const { error } = await supabaseAdmin.from("rostros_empleados").upsert({
        empleado_id,
        descriptores,
        consentimiento_at: new Date().toISOString(),
        consentimiento_texto,
        registrado_por: user.id,
      });
      if (error) throw error;
      return json({ success: true });
    }

    // ── Action: face-fichar — la terminal reconoce al empleado por su rostro ──
    if (action === "face-fichar") {
      const user = await usuarioAutenticado();
      if (!user) return json({ error: "No autenticado" }, 401);
      if (!puedeOperarTerminal(await rolesDe(user.id))) {
        return json({ error: "Sólo las terminales de asistencia pueden fichar por rostro" }, 403);
      }

      const { data: config } = await supabaseAdmin
        .from("configuracion_grupo")
        .select("fichado_facial_activo")
        .limit(1)
        .maybeSingle();
      if (config && config.fichado_facial_activo === false) {
        return json({ error: "El fichado por reconocimiento facial está desactivado" }, 403);
      }

      const { descriptor, prueba_vida } = body;
      if (!esDescriptorValido(descriptor)) return json({ error: "Rostro no válido" }, 400);
      if (prueba_vida !== true) return json({ error: "Falta completar la prueba de vida" }, 400);

      const { data: registros } = await supabaseAdmin
        .from("rostros_empleados")
        .select("empleado_id, descriptores, empleado:empleados!inner(id, nombre, apellido, legajo, estado)")
        .neq("empleado.estado", "Baja");

      const candidatos = (registros ?? []).map((r: { empleado_id: string; descriptores: unknown }) => ({
        id: r.empleado_id,
        muestras: (r.descriptores as Descriptor[]).filter(esDescriptorValido),
      }));
      const match = mejorCoincidencia(descriptor, candidatos);
      if (!match.ok) {
        const mensajes = {
          sin_registros: "Todavía no hay rostros registrados",
          no_reconocido: "No te reconocimos. Acercate a la cámara o fichá con QR.",
          ambiguo: "No pudimos identificarte con seguridad. Probá de nuevo o fichá con QR.",
        };
        return json({ error: mensajes[match.motivo], motivo: match.motivo }, 404);
      }

      const reg = (registros ?? []).find((r: { empleado_id: string }) => r.empleado_id === match.id) as
        | { empleado: { id: string; nombre: string; apellido: string; legajo: string } }
        | undefined;
      const emp = reg!.empleado;

      const hoy = fechaArgentina();
      const { data: ultima } = await supabaseAdmin
        .from("fichadas")
        .select("id, hora_entrada, hora_salida")
        .eq("empleado_id", emp.id)
        .eq("fecha", hoy)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const ultimaMarca = ultima ? new Date(ultima.hora_salida ?? ultima.hora_entrada ?? 0).getTime() : 0;
      if (ultimaMarca && Date.now() - ultimaMarca < ESPERA_REFICHAR_SEG * 1000) {
        return json({
          success: false,
          repetida: true,
          tipo: ultima!.hora_salida ? "salida" : "entrada",
          empleado: emp,
          hora: ultima!.hora_salida ?? ultima!.hora_entrada,
        });
      }

      const ahora = new Date().toISOString();
      let tipo: "entrada" | "salida";
      if (ultima && !ultima.hora_salida) {
        await supabaseAdmin.from("fichadas").update({ hora_salida: ahora }).eq("id", ultima.id);
        tipo = "salida";
      } else {
        await supabaseAdmin.from("fichadas").insert({
          empleado_id: emp.id,
          fecha: hoy,
          hora_entrada: ahora,
          estado: "presente",
          metodo: "facial",
          terminal_user_id: user.id,
        });
        tipo = "entrada";
      }

      return json({ success: true, tipo, empleado: emp, hora: ahora });
    }

    // ── Action: qr-issue — la terminal solicita un código QR de un solo uso ──
    if (action === "qr-issue") {
      const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (!jwt) {
        return new Response(JSON.stringify({ error: "No autenticado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: userData } = await supabaseAdmin.auth.getUser(jwt);
      if (!userData?.user) {
        return new Response(JSON.stringify({ error: "Sesión inválida" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Sólo una terminal puede emitir QR: si un empleado pudiera, se escanearía a sí mismo desde cualquier lugar.
      if (!puedeOperarTerminal(await rolesDe(userData.user.id))) {
        return json({ error: "Sólo las terminales de asistencia pueden generar el QR" }, 403);
      }

      const { data: config } = await supabaseAdmin
        .from("configuracion_grupo")
        .select("qr_duracion_segundos, fichado_qr_activo")
        .limit(1)
        .maybeSingle();

      if (config && config.fichado_qr_activo === false) {
        return new Response(JSON.stringify({ error: "El fichado por QR está desactivado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const duracion = config?.qr_duracion_segundos ?? 10;
      const codigo = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0, 8);
      const expiraAt = new Date(Date.now() + duracion * 1000).toISOString();

      const { error: insErr } = await supabaseAdmin.from("qr_sesiones").insert({
        codigo,
        terminal_user_id: userData.user.id,
        expira_at: expiraAt,
      });
      if (insErr) throw insErr;

      // Limpieza de códigos viejos (mayores a 1 hora)
      await supabaseAdmin
        .from("qr_sesiones")
        .delete()
        .lt("emitido_at", new Date(Date.now() - 3600_000).toISOString());

      return new Response(
        JSON.stringify({ codigo, expira_at: expiraAt, duracion_segundos: duracion }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: qr-fichar — el empleado escanea el QR desde su celular ──
    if (action === "qr-fichar") {
      if (!codigo || typeof codigo !== "string") {
        return new Response(JSON.stringify({ error: "Código QR inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
      const { data: userData } = jwt
        ? await supabaseAdmin.auth.getUser(jwt)
        : { data: null as never };
      if (!userData?.user?.id) {
        return new Response(JSON.stringify({ error: "Debés iniciar sesión para fichar" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: emp } = await supabaseAdmin
        .from("empleados")
        .select("id, nombre, apellido, legajo, estado")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!emp) {
        return new Response(JSON.stringify({ error: "No se encontró tu legajo" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (emp.estado === "Baja") {
        return new Response(JSON.stringify({ error: "Legajo inactivo" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: qr } = await supabaseAdmin
        .from("qr_sesiones")
        .select("id, expira_at, consumido, terminal_user_id")
        .eq("codigo", codigo)
        .maybeSingle();

      if (!qr) {
        return new Response(JSON.stringify({ error: "Código QR no reconocido" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (qr.consumido) {
        return new Response(JSON.stringify({ error: "Este QR ya fue utilizado" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // 5 segundos de gracia por demoras de red
      if (new Date(qr.expira_at).getTime() + 5000 < Date.now()) {
        return new Response(JSON.stringify({ error: "QR vencido, escaneá el nuevo código" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Consumo atómico: sólo el primero que lo marque puede fichar
      const { data: claimed } = await supabaseAdmin
        .from("qr_sesiones")
        .update({ consumido: true, consumido_por: emp.id, consumido_at: new Date().toISOString() })
        .eq("id", qr.id)
        .eq("consumido", false)
        .select("id");

      if (!claimed?.length) {
        return new Response(JSON.stringify({ error: "Este QR ya fue utilizado" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hoy = fechaArgentina();
      const { data: openFichada } = await supabaseAdmin
        .from("fichadas")
        .select("id")
        .eq("empleado_id", emp.id)
        .eq("fecha", hoy)
        .is("hora_salida", null)
        .order("created_at", { ascending: false })
        .limit(1);

      const ahora = new Date().toISOString();
      let tipo: string;

      if (openFichada && openFichada.length > 0) {
        await supabaseAdmin
          .from("fichadas")
          .update({ hora_salida: ahora })
          .eq("id", openFichada[0].id);
        tipo = "salida";
      } else {
        await supabaseAdmin.from("fichadas").insert({
          empleado_id: emp.id,
          fecha: hoy,
          hora_entrada: ahora,
          estado: "presente",
          metodo: "qr",
          terminal_user_id: qr.terminal_user_id,
        });
        tipo = "entrada";
      }

      return new Response(
        JSON.stringify({
          success: true,
          tipo,
          empleado: { id: emp.id, nombre: emp.nombre, apellido: emp.apellido, legajo: emp.legajo },
          hora: ahora,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }



    return new Response(JSON.stringify({ error: "Acción no válida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
