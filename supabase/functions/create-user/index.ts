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

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta configuración del backend: ${name}`);
  return value;
}

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
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_ANON_KEY"),
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
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const body = await req.json();
    const action = body.action ?? "create-user";

    if (action === "list-users") {
      const { data: roles, error } = await adminClient
        .from("user_roles")
        .select("id, user_id, role")
        .order("role");
      if (error) throw error;

      const { data: usersPage, error: usersErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersErr) throw usersErr;

      const emailById = new Map(usersPage.users.map((user) => [user.id, user.email]));
      const response = (roles ?? []).map((item) => ({
        ...item,
        email: emailById.get(item.user_id) ?? null,
      }));

      return new Response(JSON.stringify(response), { headers: corsHeaders });
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

    if (action === "delete-user") {
      // En la demo las cuentas de cada prospecto conviven en la misma base: no pueden borrar usuarios
      if ((claimsData.claims.user_metadata as { demo?: boolean } | undefined)?.demo) {
        return new Response(JSON.stringify({ error: "En la demo no se pueden eliminar usuarios" }), { status: 403, headers: corsHeaders });
      }
      const { user_id } = body;
      if (!user_id || typeof user_id !== "string") {
        return new Response(JSON.stringify({ error: "Usuario inválido" }), { status: 400, headers: corsHeaders });
      }
      if (user_id === callerId) {
        return new Response(JSON.stringify({ error: "No podés eliminar tu propio usuario" }), { status: 400, headers: corsHeaders });
      }
      const { data: targetRoles } = await adminClient.from("user_roles").select("role").eq("user_id", user_id);
      if (targetRoles?.some((r) => r.role === "admin")) {
        const { count } = await adminClient.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
        if ((count ?? 0) <= 1) {
          return new Response(JSON.stringify({ error: "No se puede eliminar el último administrador" }), { status: 400, headers: corsHeaders });
        }
      }
      // El legajo se conserva (fichadas, recibos, historial): solo se desvincula
      const { error: unlinkErr } = await adminClient.from("empleados").update({ user_id: null }).eq("user_id", user_id);
      if (unlinkErr) throw unlinkErr;
      const { error: rolesErr } = await adminClient.from("user_roles").delete().eq("user_id", user_id);
      if (rolesErr) throw rolesErr;
      const { error: delErr } = await adminClient.auth.admin.deleteUser(user_id);
      if (delErr) throw delErr;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action !== "create-user") {
      return new Response(JSON.stringify({ error: "Acción no válida" }), { status: 400, headers: corsHeaders });
    }

    const { email, password, role, empleado_id } = body;

    if (!email || !password || !role || !allowedRoles.has(role)) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos o el rol es inválido" }), { status: 400, headers: corsHeaders });
    }

    if (role === "empleado") {
      if (!empleado_id) {
        return new Response(JSON.stringify({ error: "Seleccioná el legajo para vincular al empleado" }), { status: 400, headers: corsHeaders });
      }

      const { data: empleado, error: empleadoLookupErr } = await adminClient
        .from("empleados")
        .select("id, user_id")
        .eq("id", empleado_id)
        .maybeSingle();

      if (empleadoLookupErr) throw empleadoLookupErr;
      if (!empleado) {
        return new Response(JSON.stringify({ error: "Legajo no encontrado" }), { status: 404, headers: corsHeaders });
      }
      if (empleado.user_id) {
        return new Response(JSON.stringify({ error: "Ese legajo ya tiene un usuario vinculado" }), { status: 409, headers: corsHeaders });
      }
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
      const { data: updatedEmpleado, error: empleadoErr } = await adminClient
        .from("empleados")
        .update({ user_id: userId, email })
        .eq("id", empleado_id)
        .is("user_id", null)
        .select("id");

      if (empleadoErr) {
        return new Response(JSON.stringify({ error: empleadoErr.message }), { status: 400, headers: corsHeaders });
      }
      if (!updatedEmpleado?.length) {
        return new Response(JSON.stringify({ error: "No se pudo vincular el legajo" }), { status: 409, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ user_id: userId, email }), { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
