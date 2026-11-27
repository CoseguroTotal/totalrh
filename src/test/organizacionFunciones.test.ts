// Las edge functions usan la clave de servicio, que no pasa por RLS. Este control recorre su código y
// exige que toda consulta a una tabla de clientes filtre o escriba organizacion_id, salvo que lleve
// la marca explícita /* org: todas (motivo) */.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/** Tablas con organizacion_id (multiempresa). Las de sistema (demo_*, push_*, organizaciones) no están. */
const TABLAS_ORG = new Set([
  "asignaciones_turno", "candidatos", "chat_conversaciones", "chat_mensajes", "chat_participantes",
  "conceptos_liquidacion", "configuracion_grupo", "datos_medicos", "documentos_legajo", "empleados",
  "empleados_cambios", "empresas", "encuesta_participaciones", "encuesta_preguntas", "encuesta_respuestas",
  "encuestas", "estudios_empleado", "evento_asistencias", "eventos", "eventos_legajo", "feriados", "fichadas",
  "grupo_familiar", "grupo_miembros", "grupos", "liquidacion_lineas", "liquidaciones", "memorandums",
  "muro_comentarios", "muro_lecturas", "muro_publicaciones", "muro_reacciones", "notificaciones",
  "novedades_asistencia", "qr_sesiones", "restricciones_horario", "rostros_empleados", "sanciones",
  "solicitudes_alta", "solicitudes_permiso", "solicitudes_vacaciones", "soporte_mensajes", "sucursales",
  "tareas", "tokens_asistencia", "tokens_consumidos", "turnos", "user_roles", "usuario_organizacion_activa",
  "vacaciones_config", "vacantes",
]);

const FUNCIONES = path.resolve(__dirname, "../../supabase/functions");

function archivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return archivos(p);
    return e.name.endsWith(".ts") ? [p] : [];
  });
}

/** Texto de la cadena de llamadas desde `.from(...)` hasta que termina la sentencia o el argumento. */
function cadenaDesde(src: string, inicio: number): string {
  let prof = 0;
  for (let i = inicio; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const fin = src.indexOf(c, i + 1);
      i = fin < 0 ? src.length : fin;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") prof++;
    else if (c === ")" || c === "]" || c === "}") {
      if (prof === 0) return src.slice(inicio, i);
      prof--;
    } else if ((c === ";" || c === ",") && prof === 0) return src.slice(inicio, i);
  }
  return src.slice(inicio);
}

function consultasSinOrg() {
  const faltan: string[] = [];
  let revisadas = 0;
  for (const f of archivos(FUNCIONES)) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/\.from\("([a-z_]+)"\)/g)) {
      if (!TABLAS_ORG.has(m[1])) continue;
      // supabase.storage.from("bucket") no es una tabla
      if (src.slice(Math.max(0, m.index! - 10), m.index!).includes("storage")) continue;
      revisadas++;
      const cadena = cadenaDesde(src, m.index!);
      if (!/organizacion_id|\/\* org: todas/.test(cadena)) {
        const linea = src.slice(0, m.index!).split("\n").length;
        faltan.push(`${path.relative(FUNCIONES, f)}:${linea} ${m[1]}`);
      }
    }
  }
  return { faltan, revisadas };
}

describe("edge functions multiempresa", () => {
  it("recorta la cadena de la consulta hasta el final de la sentencia", () => {
    const src = 'x(admin.from("a").select("b").eq("c", f(1)), otra); y();';
    expect(cadenaDesde(src, src.indexOf(".from"))).toBe('.from("a").select("b").eq("c", f(1))');
  });

  it("toda consulta a una tabla de clientes filtra o escribe organizacion_id", () => {
    const { faltan, revisadas } = consultasSinOrg();
    expect(revisadas).toBeGreaterThan(50);
    expect(faltan).toEqual([]);
  });
});
