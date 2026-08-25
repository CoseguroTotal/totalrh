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

    const { action, token, empleado_id, codigo } = await req.json();

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
      if (!userData?.user?.email) {
        return new Response(JSON.stringify({ error: "Debés iniciar sesión para fichar" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: emp } = await supabaseAdmin
        .from("empleados")
        .select("id, nombre, apellido, legajo, estado")
        .eq("email", userData.user.email)
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

      const hoy = new Date().toISOString().slice(0, 10);
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
