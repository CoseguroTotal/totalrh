import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Globe, Loader2, Lock, LogOut, Pencil, Search, Settings2, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFeed, useLecturas, usePerfiles, useSessionUserId } from "@/hooks/useMuro";
import { useDirectorio } from "@/hooks/useChat";
import { useEmpresas, useSucursales } from "@/hooks/useEmpleados";
import { useEliminarGrupo, useGestionMiembros, useGrupos, useMiembros, useUnirseGrupo } from "@/hooks/useGrupos";
import { Composer, PostCard, UserAvatar, nombreCompleto } from "@/components/muro/MuroComponents";
import { GrupoFormDialog, PortadaGrupo } from "@/pages/Grupos";

export default function GrupoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: yo } = useSessionUserId();
  const { data: grupos = [], isLoading } = useGrupos();
  const grupo = grupos.find((g) => g.id === id);
  const { data: miembros = [] } = useMiembros(id);
  const unirse = useUnirseGrupo();
  const eliminar = useEliminarGrupo();
  const [panel, setPanel] = useState<"miembros" | null>(null);
  const [editar, setEditar] = useState(false);

  // Si no es miembro, la base no devuelve publicaciones del grupo (RLS)
  const feed = useFeed(id);
  const publicaciones = useMemo(() => (grupo?.soy_miembro || grupo?.soy_admin ? feed.data?.pages.flat() ?? [] : []), [feed.data, grupo]);
  const ids = useMemo(() => {
    const s = new Set<string>(yo ? [yo] : []);
    publicaciones.forEach((p) => { s.add(p.autor_id); p.comentarios.forEach((c) => s.add(c.autor_id)); });
    return [...s];
  }, [publicaciones, yo]);
  const { data: perfiles = new Map() } = usePerfiles(ids);
  const { data: lecturas } = useLecturas(publicaciones.map((p) => p.id));
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = finRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((e) => { if (e[0].isIntersecting && feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage(); }, { rootMargin: "400px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [feed]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!grupo) return (
    <div className="py-20 text-center">
      <p className="text-muted-foreground">No encontramos el grupo o es privado.</p>
      <Button variant="link" onClick={() => navigate("/grupos")}>Ver grupos</Button>
    </div>
  );

  const puedeVer = grupo.soy_miembro || grupo.soy_admin;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/grupos")}><ArrowLeft className="h-4 w-4 mr-1.5" />Grupos</Button>

      <header className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="h-24 sm:h-32" style={{ background: `linear-gradient(135deg, ${grupo.color}, ${grupo.color}99)` }} />
        <div className="-mt-10 flex flex-wrap items-end gap-4 px-5 pb-5">
          <div className="rounded-2xl bg-card p-1"><PortadaGrupo g={grupo} size="lg" /></div>
          <div className="min-w-0 flex-1 pt-10">
            <h1 className="truncate text-2xl font-bold">{grupo.nombre}</h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {grupo.tipo === "privado" ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              Grupo {grupo.tipo} · {grupo.miembros} {grupo.miembros === 1 ? "miembro" : "miembros"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPanel("miembros")}><Users className="h-4 w-4 mr-1.5" />Miembros</Button>
            {grupo.soy_admin && <Button variant="secondary" size="sm" onClick={() => setEditar(true)}><Pencil className="h-4 w-4 mr-1.5" />Editar</Button>}
            {!grupo.soy_miembro && grupo.tipo === "abierto" && (
              <Button size="sm" disabled={unirse.isPending} onClick={() => unirse.mutate({ grupoId: grupo.id, unirse: true }, { onSuccess: () => toast.success("¡Te sumaste!") })}>Unirme</Button>
            )}
            {grupo.soy_miembro && !grupo.soy_admin && (
              <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={unirse.isPending}
                onClick={() => { if (confirm(`¿Salir de ${grupo.nombre}?`)) unirse.mutate({ grupoId: grupo.id, unirse: false }); }}>
                <LogOut className="h-4 w-4 mr-1.5" />Salir
              </Button>
            )}
          </div>
        </div>
        {grupo.descripcion && <p className="border-t px-5 py-3 text-sm whitespace-pre-wrap">{grupo.descripcion}</p>}
      </header>

      {!puedeVer ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {grupo.tipo === "abierto" ? "Sumate para ver y publicar en el grupo." : "Es un grupo privado: lo ven sólo sus miembros."}
        </div>
      ) : (
        <>
          {puedeVer && (
            <Composer perfil={yo ? perfiles.get(yo) : null} esModerador={grupo.soy_admin} grupo={{ id: grupo.id, nombre: grupo.nombre }} />
          )}
          {grupo.soy_admin && (
            <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-warning" />Como administrador podés publicar comunicados que avisan sólo a los miembros del grupo.
            </p>
          )}
          {feed.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : publicaciones.length === 0 ? (
            <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">Todavía no hay publicaciones en el grupo.</div>
          ) : publicaciones.map((p) => (
            <PostCard key={p.id} pub={p} perfiles={perfiles} userId={yo} esModerador={grupo.soy_admin} lectura={lecturas?.get(p.id)} />
          ))}
          <div ref={finRef} />
        </>
      )}

      <MiembrosDialog open={panel === "miembros"} onOpenChange={(o) => setPanel(o ? "miembros" : null)} grupoId={grupo.id} soyAdmin={grupo.soy_admin} miembros={miembros} yo={yo} />
      {editar && (
        <GrupoFormDialog open={editar} onOpenChange={setEditar} grupo={grupo} />
      )}
      {grupo.soy_admin && (
        <div className="pt-6 text-center">
          <Button variant="ghost" size="sm" className="text-destructive" disabled={eliminar.isPending}
            onClick={() => { if (confirm(`¿Eliminar el grupo ${grupo.nombre}? Se borran también sus publicaciones.`)) eliminar.mutate(grupo.id, { onSuccess: () => { toast.success("Grupo eliminado"); navigate("/grupos"); } }); }}>
            <Trash2 className="h-4 w-4 mr-1.5" />Eliminar grupo
          </Button>
        </div>
      )}
    </div>
  );
}

function MiembrosDialog({
  open, onOpenChange, grupoId, soyAdmin, miembros, yo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  grupoId: string;
  soyAdmin: boolean;
  miembros: { user_id: string; rol: "admin" | "miembro" }[];
  yo: string | null | undefined;
}) {
  const [pestana, setPestana] = useState<"lista" | "agregar">("lista");
  const [busqueda, setBusqueda] = useState("");
  const { data: perfiles = new Map() } = usePerfiles(miembros.map((m) => m.user_id));
  const { data: personas = [] } = useDirectorio();
  const { agregar, quitar, cambiarRol, masivo } = useGestionMiembros(grupoId);
  const { data: empresas = [] } = useEmpresas();
  const [empresaId, setEmpresaId] = useState("todas");
  const { data: sucursales = [] } = useSucursales(empresaId === "todas" ? undefined : empresaId);
  const [sucursalId, setSucursalId] = useState("todas");

  const enGrupo = new Set(miembros.map((m) => m.user_id));
  const candidatos = personas.filter((p) => !enGrupo.has(p.user_id) && `${p.nombre} ${p.apellido} ${p.puesto ?? ""}`.toLowerCase().includes(busqueda.toLowerCase()));
  const ordenados = [...miembros].sort((a, b) => (a.rol === b.rol ? nombreCompleto(perfiles.get(a.user_id)).localeCompare(nombreCompleto(perfiles.get(b.user_id))) : a.rol === "admin" ? -1 : 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Miembros</DialogTitle>
          <DialogDescription>{miembros.length} {miembros.length === 1 ? "persona" : "personas"} en el grupo</DialogDescription>
        </DialogHeader>
        {soyAdmin && (
          <Tabs value={pestana} onValueChange={(v) => setPestana(v as typeof pestana)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lista">Miembros</TabsTrigger>
              <TabsTrigger value="agregar"><UserPlus className="h-4 w-4 mr-1.5" />Sumar personas</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {pestana === "lista" ? (
          <ul className="-mx-2 max-h-[55vh] overflow-y-auto">
            {ordenados.map((m) => {
              const p = perfiles.get(m.user_id);
              return (
                <li key={m.user_id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <UserAvatar perfil={p} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{nombreCompleto(p)}{m.user_id === yo && " (vos)"}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.rol === "admin" ? "Administrador" : p?.puesto ?? "Miembro"}</p>
                  </div>
                  {soyAdmin && m.user_id !== yo && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title={m.rol === "admin" ? "Quitar administrador" : "Hacer administrador"}
                        onClick={() => cambiarRol.mutate({ userId: m.user_id, rol: m.rol === "admin" ? "miembro" : "admin" })}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Sacar del grupo"
                        onClick={() => { if (confirm(`¿Sacar a ${nombreCompleto(p)} del grupo?`)) quitar.mutate(m.user_id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl border bg-muted/40 p-3">
              <p className="text-sm font-medium">Sumar a todo un sector</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Empresa</Label>
                  <Select value={empresaId} onValueChange={(v) => { setEmpresaId(v); setSucursalId("todas"); }}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Sucursal</Label>
                  <Select value={sucursalId} onValueChange={setSucursalId} disabled={empresaId === "todas"}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {sucursales.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" className="w-full" disabled={masivo.isPending}
                onClick={() => masivo.mutate(
                  { empresaId: empresaId === "todas" ? null : empresaId, sucursalId: sucursalId === "todas" ? null : sucursalId },
                  { onSuccess: (n) => toast.success(n ? `Se sumaron ${n} personas` : "Ya estaban todos en el grupo"), onError: () => toast.error("No se pudo sumar") }
                )}>
                {masivo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sumar a todos los del sector"}
              </Button>
            </div>
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar persona" className="pl-9" />
              </div>
              <ul className="-mx-2 mt-2 max-h-[35vh] overflow-y-auto">
                {candidatos.length === 0 ? <li className="py-4 text-center text-sm text-muted-foreground">No hay más personas para sumar.</li> : candidatos.map((p) => (
                  <li key={p.user_id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                    <UserAvatar perfil={p} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{nombreCompleto(p)}</p>
                      {p.puesto && <p className="truncate text-xs text-muted-foreground">{p.puesto}</p>}
                    </div>
                    <Button size="sm" variant="secondary" disabled={agregar.isPending} onClick={() => agregar.mutate([p.user_id], { onSuccess: () => toast.success(`${nombreCompleto(p)} se sumó`) })}>Sumar</Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground"><Link to="/grupos" className="hover:underline">Ver todos los grupos</Link></p>
      </DialogContent>
    </Dialog>
  );
}
