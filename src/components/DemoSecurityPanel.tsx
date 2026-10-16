import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, ShieldAlert, Unlock } from "lucide-react";

const CAMPOS: { key: string; label: string }[] = [
  { key: "demo_codigo_minutos", label: "Vencimiento del código (min)" },
  { key: "demo_max_intentos_codigo", label: "Fallos permitidos por código" },
  { key: "demo_max_solicitudes_ip_hora", label: "Solicitudes por IP por hora" },
  { key: "demo_max_fallos_ip_hora", label: "Fallos por IP antes de bloquear (1 h)" },
  { key: "demo_bloqueo_minutos", label: "Duración del bloqueo (min)" },
  { key: "demo_acceso_dias", label: "Duración de los accesos demo (días)" },
];

async function demoAdmin(body: unknown) {
  const { data, error } = await supabase.functions.invoke("demo-admin", { body });
  if (error) {
    const ctx = (error as any).context;
    const txt = ctx?.json ? (await ctx.json().catch(() => null))?.error : null;
    throw new Error(txt || error.message);
  }
  return data;
}

export default function DemoSecurityPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [cfg, setCfg] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [nuevoCodigo, setNuevoCodigo] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("todos");

  const config = useQuery({
    queryKey: ["demo-config"],
    queryFn: async () => (await supabase.from("configuracion_grupo").select("*").limit(1).single()).data as any,
  });
  useEffect(() => {
    if (config.data) setCfg(Object.fromEntries(CAMPOS.map((c) => [c.key, config.data[c.key]])));
  }, [config.data]);

  const maestro = useQuery({
    queryKey: ["demo-maestro"],
    queryFn: async () => (await supabase.from("demo_codigo_maestro" as any).select("*").eq("activo", true).order("created_at", { ascending: false }).limit(1).maybeSingle()).data as any,
  });
  const intentos = useQuery({
    queryKey: ["demo-intentos"],
    queryFn: async () => ((await supabase.from("demo_intentos" as any).select("*").order("created_at", { ascending: false }).limit(300)).data ?? []) as any[],
  });
  const bloqueos = useQuery({
    queryKey: ["demo-bloqueos"],
    queryFn: async () => ((await supabase.from("demo_bloqueos" as any).select("*").gt("hasta", new Date().toISOString())).data ?? []) as any[],
  });

  const run = async (body: unknown, ok: string) => {
    try {
      const r = await demoAdmin(body);
      toast({ title: ok });
      qc.invalidateQueries({ queryKey: ["demo-maestro"] });
      qc.invalidateQueries({ queryKey: ["demo-bloqueos"] });
      qc.invalidateQueries({ queryKey: ["demo-config"] });
      return r;
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const filas = (intentos.data ?? []).filter((r) => filtro === "todos" || r.resultado === filtro);

  return (
    <Tabs defaultValue="seguridad" className="pt-2">
      <TabsList>
        <TabsTrigger value="seguridad">Seguridad de la demo</TabsTrigger>
        <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
      </TabsList>

      <TabsContent value="seguridad" className="space-y-6 pt-3">
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-medium flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Código para muestras en vivo</h3>
          {nuevoCodigo && (
            <div className="rounded-md bg-primary/10 p-3 text-center">
              <p className="text-xs text-muted-foreground">Nuevo código (anotalo, no se vuelve a mostrar)</p>
              <p className="text-2xl font-bold tracking-[0.3em] text-primary">{nuevoCodigo}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {maestro.data
              ? `Activo · vence ${new Date(maestro.data.expira_at).toLocaleDateString("es-AR")} · ${maestro.data.usos} uso(s)`
              : "No hay un código activo."}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={async () => { const r = await run({ action: "generar_maestro", dias: 30 }, "Código generado"); if (r?.codigo) setNuevoCodigo(r.codigo); }}>
              {maestro.data ? "Regenerar (30 días)" : "Generar (30 días)"}
            </Button>
            {maestro.data && <Button size="sm" variant="outline" onClick={() => { setNuevoCodigo(null); run({ action: "desactivar_maestro" }, "Código desactivado"); }}>Desactivar</Button>}
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-medium">Límites y vencimientos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CAMPOS.map((c) => (
              <div key={c.key}>
                <Label htmlFor={c.key} className="text-xs">{c.label}</Label>
                <Input id={c.key} type="number" min={1} value={cfg[c.key] ?? ""} onChange={(e) => setCfg({ ...cfg, [c.key]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <Button size="sm" disabled={saving} onClick={async () => { setSaving(true); await run({ action: "guardar_config", config: cfg }, "Configuración guardada"); setSaving(false); }}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Guardar
          </Button>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-medium flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Bloqueos activos</h3>
          {!(bloqueos.data ?? []).length && <p className="text-sm text-muted-foreground">Sin bloqueos activos.</p>}
          {(bloqueos.data ?? []).map((b) => (
            <div key={b.id} className="flex items-center justify-between text-sm border-t pt-2">
              <span><strong>{b.clave}</strong> · {b.motivo} · hasta {new Date(b.hasta).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
              <Button size="sm" variant="ghost" onClick={() => run({ action: "desbloquear", clave: b.clave }, "Desbloqueado")}><Unlock className="h-4 w-4 mr-1" /> Desbloquear</Button>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="auditoria" className="space-y-3 pt-3">
        <div className="flex gap-2 flex-wrap">
          {["todos", "ok", "fallido", "bloqueado"].map((f) => (
            <Button key={f} size="sm" variant={filtro === f ? "default" : "outline"} onClick={() => setFiltro(f)}>{f}</Button>
          ))}
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60"><tr className="text-left">
              <th className="px-3 py-2 font-medium">Fecha</th><th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Resultado</th><th className="px-3 py-2 font-medium">Email</th><th className="px-3 py-2 font-medium">IP</th>
            </tr></thead>
            <tbody>
              {filas.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("es-AR")}</td>
                  <td className="px-3 py-2">{r.tipo}</td>
                  <td className={`px-3 py-2 ${r.resultado === "ok" ? "text-primary" : r.resultado === "fallido" || r.resultado === "bloqueado" ? "text-destructive" : ""}`}>{r.resultado}</td>
                  <td className="px-3 py-2">{r.email ?? "—"}</td>
                  <td className="px-3 py-2">{r.ip ?? "—"}</td>
                </tr>
              ))}
              {!filas.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sin registros.</td></tr>}
            </tbody>
          </table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
