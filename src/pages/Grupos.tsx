import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe, Loader2, Lock, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useEsModerador } from "@/hooks/useMuro";
import { COLORES_GRUPO, useGrupos, useGuardarGrupo, useUnirseGrupo, type GrupoListado } from "@/hooks/useGrupos";

export function inicialesGrupo(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function PortadaGrupo({ g, size = "md" }: { g: Pick<GrupoListado, "nombre" | "color">; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-9 w-9 text-xs rounded-lg" : size === "lg" ? "h-16 w-16 text-xl rounded-2xl" : "h-12 w-12 text-sm rounded-xl";
  return <span className={cn("flex shrink-0 items-center justify-center font-bold text-white", dims)} style={{ background: g.color }}>{inicialesGrupo(g.nombre)}</span>;
}

export default function Grupos() {
  const navigate = useNavigate();
  const { data: esModerador = false } = useEsModerador();
  const { data: grupos = [], isLoading } = useGrupos();
  const unirse = useUnirseGrupo();
  const [nuevo, setNuevo] = useState(false);

  const mios = grupos.filter((g) => g.soy_miembro);
  const descubrir = grupos.filter((g) => !g.soy_miembro);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Users className="h-6 w-6 text-primary" />Grupos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Novedades y comunicados de cada área, sólo para quienes forman parte.</p>
        </div>
        {esModerador && <Button className="rounded-full" onClick={() => setNuevo(true)}><Plus className="h-4 w-4 mr-1.5" />Crear grupo</Button>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tus grupos</h2>
            {mios.length === 0 ? (
              <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Todavía no formás parte de ningún grupo.</div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {mios.map((g) => (
                  <li key={g.id}>
                    <Link to={`/grupos/${g.id}`} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                      <PortadaGrupo g={g} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{g.nombre}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          {g.tipo === "privado" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                          {g.tipo === "privado" ? "Privado" : "Abierto"} · {g.miembros} {g.miembros === 1 ? "miembro" : "miembros"}
                          {g.soy_admin && " · Administrás"}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {descubrir.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{esModerador ? "Otros grupos" : "Grupos abiertos para sumarte"}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {descubrir.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                    <PortadaGrupo g={g} />
                    <Link to={`/grupos/${g.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-semibold hover:underline">{g.nombre}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{g.descripcion || `${g.miembros} miembros`}</p>
                    </Link>
                    {g.tipo === "abierto" && (
                      <Button size="sm" variant="secondary" disabled={unirse.isPending}
                        onClick={() => unirse.mutate({ grupoId: g.id, unirse: true }, { onSuccess: () => toast.success(`Te sumaste a ${g.nombre}`) })}>
                        Unirme
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <GrupoFormDialog open={nuevo} onOpenChange={setNuevo} onGuardado={(id) => navigate(`/grupos/${id}`)} />
    </div>
  );
}

export function GrupoFormDialog({
  open, onOpenChange, grupo, onGuardado,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  grupo?: Pick<GrupoListado, "id" | "nombre" | "descripcion" | "tipo" | "color"> | null;
  onGuardado?: (id: string) => void;
}) {
  const guardar = useGuardarGrupo();
  const [nombre, setNombre] = useState(grupo?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(grupo?.descripcion ?? "");
  const [tipo, setTipo] = useState<"abierto" | "privado">(grupo?.tipo ?? "privado");
  const [color, setColor] = useState(grupo?.color ?? COLORES_GRUPO[0]);

  const enviar = () => {
    if (nombre.trim().length < 2) { toast.error("Poné un nombre al grupo"); return; }
    guardar.mutate({ id: grupo?.id, nombre, descripcion, tipo, color }, {
      onSuccess: (id) => { toast.success(grupo ? "Grupo actualizado" : "Grupo creado"); onOpenChange(false); onGuardado?.(id); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{grupo ? "Editar grupo" : "Crear grupo"}</DialogTitle>
          <DialogDescription>Por ejemplo, un grupo por área: Logística, Administración, Ventas…</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <PortadaGrupo g={{ nombre: nombre || "Grupo", color }} size="lg" />
            <div className="flex-1"><Label>Nombre</Label><Input className="mt-1.5" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} placeholder="Ej.: Logística" /></div>
          </div>
          <div><Label>Descripción (opcional)</Label><Textarea className="mt-1.5" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={1000} /></div>
          <div>
            <Label>Color</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {COLORES_GRUPO.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`}
                  className={cn("h-8 w-8 rounded-full ring-offset-2 ring-offset-background", color === c && "ring-2 ring-foreground")} style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([["privado", Lock, "Privado", "Sólo lo suman los administradores"], ["abierto", Globe, "Abierto", "Cualquiera puede sumarse"]] as const).map(([id, Icono, titulo, desc]) => (
              <button key={id} type="button" onClick={() => setTipo(id)}
                className={cn("rounded-xl border-2 p-3 text-left transition-colors", tipo === id ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
                <p className="flex items-center gap-1.5 text-sm font-semibold"><Icono className="h-4 w-4" />{titulo}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={enviar} disabled={guardar.isPending}>{guardar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : grupo ? "Guardar" : "Crear grupo"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
