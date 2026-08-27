import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const codigo = String(body?.codigo ?? "").trim();

    if (!email || !/^\d{6}$/.test(codigo)) {
      return json({ error: "Código inválido" }, 400);
    }

    const { data: lead } = await admin
      .from("demo_leads")
      .select("id, accesos")
      .eq("email", email)
      .maybeSingle();

    if (!lead) return json({ error: "No encontramos una solicitud para ese email" }, 404);

    const { data: registro } = await admin
      .from("demo_codigos")
      .select("id, codigo_hash, expira_at, consumido, intentos")
      .eq("lead_id", lead.id)
      .eq("consumido", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!registro) return json({ error: "Pedí un código nuevo" }, 400);
    if (new Date(registro.expira_at) < new Date()) return json({ error: "El código venció. Pedí uno nuevo." }, 400);
    if (registro.intentos >= 5) return json({ error: "Demasiados intentos fallidos. Pedí un código nuevo." }, 429);

    if (registro.codigo_hash !== (await sha256(codigo))) {
      await admin.from("demo_codigos").update({ intentos: registro.intentos + 1 }).eq("id", registro.id);
      return json({ error: "Código incorrecto" }, 400);
    }

    await admin
      .from("demo_codigos")
      .update({ consumido: true, consumido_at: new Date().toISOString() })
      .eq("id", registro.id);

    await admin
      .from("demo_leads")
      .update({
        verificado: true,
        accesos: (lead.accesos ?? 0) + 1,
        ultimo_acceso: new Date().toISOString(),
      })
      .eq("id", lead.id);

    return json({ success: true, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
  } catch (error) {
    console.error("demo-verify-code error:", error);
    return json({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
