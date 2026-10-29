// Alta de empleados desde el portal.
//
// Públicas (con el código de la empresa): info, registrar, login-dni.
// Para RRHH/admin: aprobar, rechazar, blanquear.
//
// La cuenta se crea suspendida (ban) hasta que RRHH la aprueba y la vincula a un legajo,
// así una persona sin aprobar no puede leer nada del sistema.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient, bloquear, checkBloqueo, corsHeaders, getIp, json, logIntento } from "../_shared/demo-security.ts";
import {
  formatoCuil, normalizarCodigo, pareceDni, problemaPassword, puedeAsignarRolAlta, soloDigitos, validarRegistro, type DatosRegistro,
} from "../_shared/registro-rules.ts";

const SUSPENDIDA = "876000h"; // ~100 años: suspendida hasta que se apruebe
const MAX_FALLOS_HORA = 10;
const BLOQUEO_MIN = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = adminClient();
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;
    const ip = getIp(req);

    /** Cuenta fallos de la IP en la última hora y la bloquea si se pasa. */
    const fallo = async (tipo: string, clave: string | null) => {
      await logIntento(admin, ip, clave, tipo, "fallo");
      const desde = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await admin
        .from("demo_intentos").select("id", { count: "exact", head: true })
        .eq("ip", ip).eq("tipo", tipo).eq("resultado", "fallo").gte("created_at", desde);
      if ((count ?? 0) >= MAX_FALLOS_HORA) await bloquear(admin, `ip:${ip}`, BLOQUEO_MIN, `Demasiados intentos (${tipo})`);
    };

    const config = async () => {
      const { data } = await admin.from("configuracion_grupo").select("registro_codigo, registro_abierto").limit(1).maybeSingle();
      return data;
    };

    const codigoOk = async (codigo: unknown) => {
      const c = await config();
      if (!c?.registro_abierto || !c.registro_codigo) return { ok: false as const, error: "El registro de empleados está cerrado. Consultá con RRHH." };
      if (normalizarCodigo(String(codigo ?? "")) !== normalizarCodigo(c.registro_codigo)) {
        return { ok: false as const, error: "El código de la empresa no es correcto. Pedíselo a RRHH o usá el enlace que te enviaron." };
      }
      return { ok: true as const };
    };

    // ── info: valida el código y devuelve empresas y sucursales para el formulario ──
    if (action === "info") {
      const bloqueo = await checkBloqueo(admin, [`ip:${ip}`]);
      if (bloqueo) return bloqueo;
      const v = await codigoOk(body.codigo);
      if (!v.ok) { await fallo("registro-codigo", null); return json({ error: v.error }, 403); }
      const [{ data: empresas }, { data: sucursales }] = await Promise.all([
        admin.from("empresas").select("id, nombre").order("nombre"),
        admin.from("sucursales").select("id, nombre, empresa_id").order("nombre"),
      ]);
      return json({
        empresas: (empresas ?? []).map((e: { id: string; nombre: string }) => ({
          id: e.id,
          nombre: e.nombre,
          sucursales: (sucursales ?? []).filter((s: { empresa_id: string }) => s.empresa_id === e.id).map((s: { id: string; nombre: string }) => ({ id: s.id, nombre: s.nombre })),
        })),
      });
    }

    // ── registrar: crea la cuenta suspendida y la solicitud ──
    if (action === "registrar") {
      const bloqueo = await checkBloqueo(admin, [`ip:${ip}`]);
      if (bloqueo) return bloqueo;
      const v = await codigoOk(body.codigo);
      if (!v.ok) { await fallo("registro-codigo", null); return json({ error: v.error }, 403); }

      const d = body.datos as DatosRegistro;
      const errores = validarRegistro(d ?? {});
      if (Object.keys(errores).length) return json({ error: "Revisá los datos marcados", errores }, 400);

      const dni = soloDigitos(d.dni);
      const email = d.email.trim().toLowerCase();

      const { data: sucursal } = await admin.from("sucursales").select("id").eq("id", d.sucursal_id).eq("empresa_id", d.empresa_id).maybeSingle();
      if (!sucursal) return json({ error: "La sucursal no corresponde a la empresa elegida" }, 400);

      const { data: conCuenta } = await admin.from("empleados").select("id").eq("dni", dni).not("user_id", "is", null).limit(1);
      if (conCuenta?.length) return json({ error: "Ya tenés una cuenta. Ingresá con tu DNI y contraseña; si no la recordás, pedile a RRHH que la blanquee." }, 409);

      const { data: pendiente } = await admin.from("solicitudes_alta").select("id").eq("dni", dni).eq("estado", "pendiente").limit(1);
      if (pendiente?.length) return json({ error: "Ya enviaste tu solicitud. RRHH la está revisando." }, 409);

      const { data: creado, error: errUser } = await admin.auth.admin.createUser({
        email,
        password: d.password,
        email_confirm: true,
        ban_duration: SUSPENDIDA,
        user_metadata: { nombre: d.nombre.trim(), apellido: d.apellido.trim(), alta_portal: true },
      });
      if (errUser || !creado?.user) {
        const repetido = /already|registered|exists/i.test(errUser?.message ?? "");
        return json({ error: repetido ? "Ese email ya tiene una cuenta. Usá otro o pedile ayuda a RRHH." : "No se pudo crear la cuenta. Probá de nuevo." }, repetido ? 409 : 500);
      }

      const { error: errSol } = await admin.from("solicitudes_alta").insert({
        user_id: creado.user.id,
        dni,
        cuil: formatoCuil(d.cuil),
        nombre: d.nombre.trim(),
        apellido: d.apellido.trim(),
        fecha_nacimiento: d.fecha_nacimiento || null,
        telefono: d.telefono.trim(),
        email,
        empresa_id: d.empresa_id,
        sucursal_id: d.sucursal_id,
      });
      if (errSol) {
        await admin.auth.admin.deleteUser(creado.user.id);
        return json({ error: "No se pudo guardar la solicitud. Probá de nuevo." }, 500);
      }
      await logIntento(admin, ip, email, "registro", "ok");
      return json({ success: true });
    }

    // ── login-dni: ingreso con DNI (el email de la cuenta no se expone) ──
    if (action === "login-dni") {
      const bloqueo = await checkBloqueo(admin, [`ip:${ip}`]);
      if (bloqueo) return bloqueo;
      const dni = soloDigitos(String(body.dni ?? ""));
      const password = String(body.password ?? "");
      if (!pareceDni(dni) || !password) return json({ error: "Ingresá tu DNI y tu contraseña" }, 400);

      const { data: pend } = await admin.from("solicitudes_alta").select("id").eq("dni", dni).eq("estado", "pendiente").limit(1);
      if (pend?.length) return json({ pendiente: true, error: "Tu alta todavía está en revisión. RRHH te avisa cuando quede aprobada." }, 403);

      const { data: emps } = await admin.from("empleados").select("user_id").eq("dni", dni).not("user_id", "is", null).limit(2);
      const incorrecto = async () => { await fallo("login-dni", dni); return json({ error: "DNI o contraseña incorrectos" }, 401); };
      if (!emps?.length || emps.length > 1) return await incorrecto();

      const { data: u } = await admin.auth.admin.getUserById(emps[0].user_id);
      if (!u?.user?.email) return await incorrecto();

      const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
      const { data: s, error: errLogin } = await anon.auth.signInWithPassword({ email: u.user.email, password });
      if (errLogin || !s.session) return await incorrecto();
      return json({ access_token: s.session.access_token, refresh_token: s.session.refresh_token });
    }

    // ── Acciones de RRHH ──
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: quien } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
    const user = quien?.user;
    if (!user) return json({ error: "Debés iniciar sesión" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const rolesQuien = new Set((roles ?? []).map((r: { role: string }) => r.role));
    const esGestor = rolesQuien.has("admin") || rolesQuien.has("rrhh");
    if (!esGestor) return json({ error: "Sólo RRHH o administración pueden aprobar altas" }, 403);

    // ── blanquear: RRHH le pone una contraseña provisoria a un empleado que la olvidó ──
    if (action === "blanquear") {
      const pw = problemaPassword(String(body.password ?? ""));
      if (pw) return json({ error: pw }, 400);
      const { data: emp } = await admin.from("empleados").select("user_id").eq("id", body.empleado_id ?? "").maybeSingle();
      if (!emp?.user_id) return json({ error: "Este empleado no tiene una cuenta vinculada" }, 404);
      const { data: roles2 } = await admin.from("user_roles").select("role").eq("user_id", emp.user_id);
      // Las cuentas de gestión las administra un admin desde Configuración
      if ((roles2 ?? []).some((r: { role: string }) => r.role !== "empleado")) {
        return json({ error: "Esta cuenta no es de empleado: la blanquea un administrador desde Configuración" }, 403);
      }
      const { error } = await admin.auth.admin.updateUserById(emp.user_id, { password: String(body.password) });
      if (error) throw error;
      return json({ success: true });
    }

    const { data: sol } = await admin.from("solicitudes_alta").select("*").eq("id", body.solicitud_id ?? "").maybeSingle();
    if (!sol) return json({ error: "Solicitud no encontrada" }, 404);
    if (sol.estado !== "pendiente") return json({ error: "Esa solicitud ya fue resuelta" }, 409);

    // ── aprobar: vincula a un legajo existente o crea uno nuevo ──
    if (action === "aprobar") {
      if (!sol.user_id) return json({ error: "La cuenta de esta solicitud ya no existe" }, 409);
      // Por ejemplo, una empleada que además está a cargo de RRHH
      const rol = String(body.rol ?? "empleado");
      if (!puedeAsignarRolAlta(rolesQuien, rol)) {
        return json({ error: rol === "empleado" ? "No podés aprobar altas" : "Sólo un administrador puede dar roles de gestión al aprobar" }, 403);
      }
      let empleadoId = body.empleado_id as string | undefined;

      if (empleadoId) {
        const { data: emp } = await admin.from("empleados").select("id, user_id").eq("id", empleadoId).maybeSingle();
        if (!emp) return json({ error: "Legajo no encontrado" }, 404);
        if (emp.user_id && emp.user_id !== sol.user_id) return json({ error: "Ese legajo ya tiene otra cuenta vinculada" }, 409);
        const { error } = await admin.from("empleados")
          .update({ user_id: sol.user_id, email: sol.email, telefono: sol.telefono })
          .eq("id", empleadoId);
        if (error) throw error;
      } else {
        const n = body.nuevo_legajo as { legajo?: string; puesto?: string; fecha_ingreso?: string } | undefined;
        if (!n?.legajo?.trim() || !n.puesto?.trim() || !n.fecha_ingreso) {
          return json({ error: "Para crear el legajo completá número de legajo, puesto y fecha de ingreso" }, 400);
        }
        const { data: nuevo, error } = await admin.from("empleados").insert({
          user_id: sol.user_id,
          legajo: n.legajo.trim(),
          puesto: n.puesto.trim(),
          fecha_ingreso: n.fecha_ingreso,
          nombre: sol.nombre,
          apellido: sol.apellido,
          dni: sol.dni,
          cuil: sol.cuil,
          fecha_nacimiento: sol.fecha_nacimiento,
          email: sol.email,
          telefono: sol.telefono,
          empresa_id: sol.empresa_id,
          sucursal_id: sol.sucursal_id,
        }).select("id").single();
        if (error) return json({ error: /duplicate|unique/i.test(error.message) ? "Ya existe un legajo con ese número o DNI" : error.message }, 409);
        empleadoId = nuevo.id;
      }

      // Un rol por usuario (la app lee uno solo)
      await admin.from("user_roles").delete().eq("user_id", sol.user_id);
      const { error: errRol } = await admin.from("user_roles").insert({ user_id: sol.user_id, role: rol });
      if (errRol) throw errRol;
      const { error: errBan } = await admin.auth.admin.updateUserById(sol.user_id, { ban_duration: "none" });
      if (errBan) throw errBan;
      await admin.from("solicitudes_alta").update({
        estado: "aprobada", empleado_id: empleadoId, revisado_por: user.id, revisado_at: new Date().toISOString(),
      }).eq("id", sol.id);
      return json({ success: true, empleado_id: empleadoId, email: sol.email, nombre: sol.nombre, rol });
    }

    // ── rechazar: borra la cuenta y guarda el motivo ──
    if (action === "rechazar") {
      const motivo = String(body.motivo ?? "").trim();
      if (motivo.length < 3) return json({ error: "Escribí el motivo del rechazo" }, 400);
      if (sol.user_id) await admin.auth.admin.deleteUser(sol.user_id);
      await admin.from("solicitudes_alta").update({
        estado: "rechazada", motivo_rechazo: motivo, user_id: null, revisado_por: user.id, revisado_at: new Date().toISOString(),
      }).eq("id", sol.id);
      return json({ success: true, email: sol.email, nombre: sol.nombre });
    }

    return json({ error: "Acción no válida" }, 400);
  } catch (e) {
    console.error("registro-empleado", e);
    return json({ error: e instanceof Error ? e.message : "Error inesperado" }, 500);
  }
});
