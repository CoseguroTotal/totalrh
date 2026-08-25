import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const allowedRoles = new Set([
  "admin",
  "contador",
  "gerente",
  "rrhh",
  "usuario",
  "empleado",
  "registro_asistencia",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const callerId = claimsData.claims.sub;
    const { data: roleData } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Solo administradores pueden gestionar usuarios" }), { status: 403, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const action = body.action ?? "create-user";

    if (action === "list-users") {
      const { data, error } = await adminClient.rpc("get_users_with_roles");
      if (error) throw error;
      return new Response(JSON.stringify(data ?? []), { headers: corsHeaders });
    }

    if (action === "update-role") {
      const { user_role_id, role } = body;
      if (!user_role_id || !role || !allowedRoles.has(role)) {
        return new Response(JSON.stringify({ error: "Datos de rol inválidos" }), { status: 400, headers: corsHeaders });
      }

      const { error } = await adminClient
        .from("user_roles")
        .update({ role })
        .eq("id", user_role_id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action !== "create-user") {
      return new Response(JSON.stringify({ error: "Acción no válida" }), { status: 400, headers: corsHeaders });
    }

    const { email, password, role, empleado_id } = body;

    if (!email || !password || !role || !allowedRoles.has(role)) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos o el rol es inválido" }), { status: 400, headers: corsHeaders });
    }

    if (role === "empleado" && !empleado_id) {
      return new Response(JSON.stringify({ error: "Seleccioná el legajo para vincular al empleado" }), { status: 400, headers: corsHeaders });
    }

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: corsHeaders });
    }

    const userId = newUser.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "No se pudo crear el usuario" }), { status: 500, headers: corsHeaders });
    }

    const { error: roleErr } = await adminClient
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), { status: 400, headers: corsHeaders });
    }

    if (role === "empleado") {
      const { error: empleadoErr } = await adminClient
        .from("empleados")
        .update({ user_id: userId, email })
        .eq("id", empleado_id)
        .is("user_id", null);

      if (empleadoErr) {
        return new Response(JSON.stringify({ error: empleadoErr.message }), { status: 400, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ user_id: userId, email }), { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
