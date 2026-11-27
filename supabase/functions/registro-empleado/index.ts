// Alta de empleados desde el portal.
//
// Públicas (con el código de la empresa): info, registrar, login-dni.
// Para RRHH/admin: aprobar, rechazar, blanquear.
//
// La cuenta se crea suspendida (ban) hasta que RRHH la aprueba y la vincula a un legajo,
// así una persona sin aprobar no puede leer nada del sistema.
//
// Multiempresa: el código de la empresa identifica la organización (cada una tiene el suyo) y el alta
// queda en ella. Las acciones de RRHH operan sólo dentro de la organización de quien las pide.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorPublico } from "../_shared/errores.ts";
import { adminClient, bloquear, checkBloqueo, corsHeaders, getIp, json, logIntento } from "../_shared/demo-security.ts";
import { esEmailSoporte } from "../_shared/soporte.ts";
import { MENSAJE_SIN_ORG, orgDeUsuario, rolesEnOrg } from "../_shared/organizacion.ts";
import { candidatosDni, elegirCuentaDni, orgPorCodigo, type IntentoDni } from "../_shared/organizacion-rules.ts";
import {
  MENSAJE_PASSWORD_DEBIL, esPasswordDebil, formatoCuil, pareceDni, problemaPassword, puedeAsignarRolAlta, soloDigitos, validarRegistro, type DatosRegistro,
} from "../_shared/registro-rules.ts";

const SUSPENDIDA = "876000h"; // ~100 años: suspendida hasta que se apruebe
const MAX_FALLOS_HORA = 10;
const BLOQUEO_MIN = 60;
/** Altas por conexión y por hora: frena que alguien con el código cree cuentas en masa. */
const MAX_ALTAS_HORA = 5;

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

    /** Organización a la que pertenece el código de la empresa. */
    const codigoOk = async (codigo: unknown) => {
      const { data } = await admin.from("configuracion_grupo")
        .select("organizacion_id, registro_codigo, registro_abierto")
        .not("registro_codigo", "is", null);
      const r = orgPorCodigo(data ?? [], String(codigo ?? ""));
      if (r.ok) return r;
      return {
        ok: false as const,
        error: r.motivo === "cerrado"
          ? "El registro de empleados está cerrado. Consultá con RRHH."
          : "El código de la empresa no es correcto. Pedíselo a RRHH o usá el enlace que te enviaron.",
      };
    };

    // ── info: valida el código y devuelve empresas y sucursales para el formulario ──
    if (action === "info") {
      const bloqueo = await checkBloqueo(admin, [`ip:${ip}`]);
      if (bloqueo) return bloqueo;
      const v = await codigoOk(body.codigo);
      if (!v.ok) { await fallo("registro-codigo", null); return json({ error: v.error }, 403); }
      const [{ data: empresas }, { data: sucursales }] = await Promise.all([
        admin.from("empresas").select("id, nombre").eq("organizacion_id", v.org).order("nombre"),
        admin.from("sucursales").select("id, nombre, empresa_id").eq("organizacion_id", v.org).order("nombre"),
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
      // La cuenta de soporte no puede crearse desde el portal
      if (esEmailSoporte(email)) return json({ error: "Ese email no se puede usar. Usá tu email personal." }, 400);

      const desde = new Date(Date.now() - 3600_000).toISOString();
      const { count: altasIp } = await admin.from("demo_intentos").select("id", { count: "exact", head: true })
        .eq("ip", ip).eq("tipo", "registro").eq("resultado", "ok").gte("created_at", desde);
      if ((altasIp ?? 0) >= MAX_ALTAS_HORA) {
        return json({ error: "Se crearon muchas cuentas desde esta conexión. Probá de nuevo en una hora o pedile ayuda a RRHH." }, 429);
      }

      const org = v.org;
      const { data: sucursal } = await admin.from("sucursales").select("id")
        .eq("id", d.sucursal_id).eq("empresa_id", d.empresa_id).eq("organizacion_id", org).maybeSingle();
      if (!sucursal) return json({ error: "La sucursal no corresponde a la empresa elegida" }, 400);

      const { data: conCuenta } = await admin.from("empleados").select("id")
        .eq("dni", dni).eq("organizacion_id", org).not("user_id", "is", null).limit(1);
      if (conCuenta?.length) return json({ error: "Ya tenés una cuenta. Ingresá con tu DNI y contraseña; si no la recordás, pedile a RRHH que la blanquee." }, 409);

      const { data: pendiente } = await admin.from("solicitudes_alta").select("id")
        .eq("dni", dni).eq("organizacion_id", org).eq("estado", "pendiente").limit(1);
      if (pendiente?.length) return json({ error: "Ya enviaste tu solicitud. RRHH la está revisando." }, 409);

      const { data: creado, error: errUser } = await admin.auth.admin.createUser({
        email,
        password: d.password,
        email_confirm: true,
        ban_duration: SUSPENDIDA,
        user_metadata: { nombre: d.nombre.trim(), apellido: d.apellido.trim(), alta_portal: true },
      });
      if (errUser || !creado?.user) {
        if (esPasswordDebil(errUser)) return json({ error: MENSAJE_PASSWORD_DEBIL, errores: { password: MENSAJE_PASSWORD_DEBIL } }, 422);
        const repetido = /already|registered|exists/i.test(errUser?.message ?? "");
        return json({ error: repetido ? "Ese email ya tiene una cuenta. Usá otro o pedile ayuda a RRHH." : "No se pudo crear la cuenta. Probá de nuevo." }, repetido ? 409 : 500);
      }

      const { error: errSol } = await admin.from("solicitudes_alta").insert({
        organizacion_id: org,
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

      const incorrecto = async () => { await fallo("login-dni", dni); return json({ error: "DNI o contraseña incorrectos" }, 401); };
      // El mismo DNI puede estar en más de una organización: se prueba la contraseña en cada cuenta
      // y entra la única que coincide (si coinciden dos, se pide el email).
      const { data: emps } = await admin.from("empleados").select("user_id")
        .eq("dni", dni).not("user_id", "is", null) /* org: todas (el DNI puede estar en varias) */ .limit(5);
      const { data: pend } = await admin.from("solicitudes_alta").select("user_id")
        .eq("dni", dni).eq("estado", "pendiente") /* org: todas (el DNI puede estar en varias) */ .limit(5);
      const candidatos = candidatosDni(emps ?? [], pend ?? []);
      if (!candidatos.length) return await incorrecto();

      const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
      const intentos: IntentoDni[] = [];
      const sesiones: ({ access_token: string; refresh_token: string } | null)[] = [];
      for (const userId of candidatos) {
        const { data: u } = await admin.auth.admin.getUserById(userId);
        if (!u?.user?.email) { intentos.push("fallo"); sesiones.push(null); continue; }
        const { data: s, error: errLogin } = await anon.auth.signInWithPassword({ email: u.user.email, password });
        if (errLogin && /banned/i.test(errLogin.message)) { intentos.push("suspendida"); sesiones.push(null); continue; }
        if (errLogin || !s.session) { intentos.push("fallo"); sesiones.push(null); continue; }
        intentos.push("ok");
        sesiones.push({ access_token: s.session.access_token, refresh_token: s.session.refresh_token });
      }
      const elegido = elegirCuentaDni(intentos);
      if (elegido.tipo === "ok") return json(sesiones[elegido.indice]);
      // La cuenta sin aprobar está suspendida: con la contraseña correcta, se le avisa que está en revisión
      if (elegido.tipo === "pendiente") {
        return json({ pendiente: true, error: "Tu alta todavía está en revisión. RRHH te avisa cuando quede aprobada." }, 403);
      }
      if (elegido.tipo === "ambiguo") {
        return json({ error: "Tu DNI está en más de una empresa con la misma contraseña. Ingresá con tu email." }, 409);
      }
      return await incorrecto();
    }

    // ── Acciones de RRHH ──
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: quien } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
    const user = quien?.user;
    if (!user) return json({ error: "Debés iniciar sesión" }, 401);
    const org = await orgDeUsuario(admin, user.id);
    if (!org) return json({ error: MENSAJE_SIN_ORG }, 403);
    const rolesQuien = await rolesEnOrg(admin, user.id, org);
    const esGestor = rolesQuien.has("admin") || rolesQuien.has("rrhh");
    if (!esGestor) return json({ error: "Sólo RRHH o administración pueden aprobar altas" }, 403);

    // ── blanquear: RRHH le pone una contraseña provisoria a un empleado que la olvidó ──
    if (action === "blanquear") {
      const pw = problemaPassword(String(body.password ?? ""));
      if (pw) return json({ error: pw }, 400);
      const { data: emp } = await admin.from("empleados").select("user_id")
        .eq("id", body.empleado_id ?? "").eq("organizacion_id", org).maybeSingle();
      if (!emp?.user_id) return json({ error: "Este empleado no tiene una cuenta vinculada" }, 404);
      // La contraseña es de la cuenta y vale en todas sus organizaciones: se miran todos sus roles
      const { data: roles2 } = await admin.from("user_roles").select("role")
        .eq("user_id", emp.user_id) /* org: todas (la contraseña vale en todas) */;
      // Las cuentas de gestión las administra un admin desde Configuración
      if ((roles2 ?? []).some((r: { role: string }) => r.role !== "empleado")) {
        return json({ error: "Esta cuenta no es de empleado: la blanquea un administrador desde Configuración" }, 403);
      }
      const { error } = await admin.auth.admin.updateUserById(emp.user_id, { password: String(body.password) });
      if (esPasswordDebil(error)) return json({ error: MENSAJE_PASSWORD_DEBIL }, 422);
      if (error) throw error;
      return json({ success: true });
    }

    const { data: sol } = await admin.from("solicitudes_alta").select("*")
      .eq("id", body.solicitud_id ?? "").eq("organizacion_id", org).maybeSingle();
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
        const { data: emp } = await admin.from("empleados").select("id, user_id")
          .eq("id", empleadoId).eq("organizacion_id", org).maybeSingle();
        if (!emp) return json({ error: "Legajo no encontrado" }, 404);
        if (emp.user_id && emp.user_id !== sol.user_id) return json({ error: "Ese legajo ya tiene otra cuenta vinculada" }, 409);
        const { error } = await admin.from("empleados")
          .update({ user_id: sol.user_id, email: sol.email, telefono: sol.telefono })
          .eq("id", empleadoId)
          .eq("organizacion_id", org);
        if (error) throw error;
      } else {
        const n = body.nuevo_legajo as { legajo?: string; puesto?: string; fecha_ingreso?: string } | undefined;
        if (!n?.legajo?.trim() || !n.puesto?.trim() || !n.fecha_ingreso) {
          return json({ error: "Para crear el legajo completá número de legajo, puesto y fecha de ingreso" }, 400);
        }
        const { data: nuevo, error } = await admin.from("empleados").insert({
          organizacion_id: org,
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
        if (error) return json({ error: /duplicate|unique/i.test(error.message) ? "Ya existe un legajo con ese número o DNI" : errorPublico(error, "No se pudo crear el legajo") }, 409);
        empleadoId = nuevo.id;
      }

      // Un rol por usuario en cada organización (la app lee uno solo)
      await admin.from("user_roles").delete().eq("user_id", sol.user_id).eq("organizacion_id", org);
      const { error: errRol } = await admin.from("user_roles").insert({ organizacion_id: org, user_id: sol.user_id, role: rol });
      if (errRol) throw errRol;
      const { error: errBan } = await admin.auth.admin.updateUserById(sol.user_id, { ban_duration: "none" });
      if (errBan) throw errBan;
      await admin.from("solicitudes_alta").update({
        estado: "aprobada", empleado_id: empleadoId, revisado_por: user.id, revisado_at: new Date().toISOString(),
      }).eq("id", sol.id).eq("organizacion_id", org);
      return json({ success: true, empleado_id: empleadoId, email: sol.email, nombre: sol.nombre, rol });
    }

    // ── rechazar: borra la cuenta y guarda el motivo ──
    if (action === "rechazar") {
      const motivo = String(body.motivo ?? "").trim();
      if (motivo.length < 3) return json({ error: "Escribí el motivo del rechazo" }, 400);
      if (sol.user_id) await admin.auth.admin.deleteUser(sol.user_id);
      await admin.from("solicitudes_alta").update({
        estado: "rechazada", motivo_rechazo: motivo, user_id: null, revisado_por: user.id, revisado_at: new Date().toISOString(),
      }).eq("id", sol.id).eq("organizacion_id", org);
      return json({ success: true, email: sol.email, nombre: sol.nombre });
    }

    return json({ error: "Acción no válida" }, 400);
  } catch (e) {
    console.error("registro-empleado", e);
    return json({ error: errorPublico(e) }, 500);
  }
});
