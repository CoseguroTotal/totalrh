import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple TOTP implementation
function generateTOTP(secret: string, timeStep: number = 60): string[] {
  const now = Math.floor(Date.now() / 1000);
  const tokens: string[] = [];
  // Check current window and ±1 for clock skew
  for (let offset = -1; offset <= 1; offset++) {
    const counter = Math.floor((now + offset * timeStep) / timeStep);
    const hash = simpleHash(secret + ":" + counter);
    const code = String(Math.abs(hash) % 1000000).padStart(6, "0");
    tokens.push(code);
  }
  return tokens;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit int
  }
  return hash;
}

// Generate current token for display (single, current window)
function currentTOTP(secret: string, timeStep: number = 60): string {
  const counter = Math.floor(Math.floor(Date.now() / 1000) / timeStep);
  const hash = simpleHash(secret + ":" + counter);
  return String(Math.abs(hash) % 1000000).padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, token, empleado_id } = await req.json();

    // Action: generate-secret — create or return TOTP secret for an employee
    if (action === "generate-secret") {
      if (!empleado_id) {
        return new Response(JSON.stringify({ error: "empleado_id requerido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if secret exists
      const { data: existing } = await supabaseAdmin
        .from("tokens_asistencia")
        .select("secret")
        .eq("empleado_id", empleado_id)
        .maybeSingle();

      let secret: string;
      if (existing?.secret) {
        secret = existing.secret;
      } else {
        // Generate new secret
        secret = crypto.randomUUID() + "-" + crypto.randomUUID();
        const { error } = await supabaseAdmin
          .from("tokens_asistencia")
          .insert({ empleado_id, secret });
        if (error) throw error;
      }

      // Return current token
      const code = currentTOTP(secret);
      const timeStep = 60;
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = timeStep - (now % timeStep);

      return new Response(
        JSON.stringify({ code, seconds_remaining: secondsRemaining }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: get-token — get current TOTP for the employee
    if (action === "get-token") {
      if (!empleado_id) {
        return new Response(JSON.stringify({ error: "empleado_id requerido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: tokenData } = await supabaseAdmin
        .from("tokens_asistencia")
        .select("secret")
        .eq("empleado_id", empleado_id)
        .maybeSingle();

      if (!tokenData?.secret) {
        return new Response(JSON.stringify({ error: "No hay secreto generado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const code = currentTOTP(tokenData.secret);
      const timeStep = 60;
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = timeStep - (now % timeStep);

      return new Response(
        JSON.stringify({ code, seconds_remaining: secondsRemaining }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: validate — validate token and register fichada
    if (action === "validate") {
      if (!token || token.length !== 6) {
        return new Response(JSON.stringify({ error: "Token de 6 dígitos requerido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all active secrets
      const { data: allTokens } = await supabaseAdmin
        .from("tokens_asistencia")
        .select("empleado_id, secret");

      if (!allTokens?.length) {
        return new Response(JSON.stringify({ error: "No hay empleados con token configurado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find which employee this token belongs to
      let matchedEmpleadoId: string | null = null;
      for (const t of allTokens) {
        const validTokens = generateTOTP(t.secret);
        if (validTokens.includes(token)) {
          matchedEmpleadoId = t.empleado_id;
          break;
        }
      }

      if (!matchedEmpleadoId) {
        return new Response(JSON.stringify({ error: "Token inválido o expirado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if token was already consumed
      const { data: consumed } = await supabaseAdmin
        .from("tokens_consumidos")
        .select("id")
        .eq("empleado_id", matchedEmpleadoId)
        .eq("token", token)
        .maybeSingle();

      if (consumed) {
        return new Response(JSON.stringify({ error: "Token ya utilizado" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark token as consumed
      await supabaseAdmin.from("tokens_consumidos").insert({
        empleado_id: matchedEmpleadoId,
        token,
      });

      // Get employee data
      const { data: emp } = await supabaseAdmin
        .from("empleados")
        .select("id, nombre, apellido, legajo")
        .eq("id", matchedEmpleadoId)
        .single();

      // Check if there's an open fichada today
      const hoy = new Date().toISOString().slice(0, 10);
      const { data: openFichada } = await supabaseAdmin
        .from("fichadas")
        .select("id")
        .eq("empleado_id", matchedEmpleadoId)
        .eq("fecha", hoy)
        .is("hora_salida", null)
        .order("created_at", { ascending: false })
        .limit(1);

      const ahora = new Date().toISOString();
      let tipo: string;

      if (openFichada && openFichada.length > 0) {
        // Register salida
        await supabaseAdmin
          .from("fichadas")
          .update({ hora_salida: ahora })
          .eq("id", openFichada[0].id);
        tipo = "salida";
      } else {
        // Register entrada
        await supabaseAdmin.from("fichadas").insert({
          empleado_id: matchedEmpleadoId,
          fecha: hoy,
          hora_entrada: ahora,
          estado: "presente",
        });
        tipo = "entrada";
      }

      return new Response(
        JSON.stringify({
          success: true,
          tipo,
          empleado: emp,
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
