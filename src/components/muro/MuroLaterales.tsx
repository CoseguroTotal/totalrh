import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ClipboardList, DollarSign, FileText, Loader2, MessageCircle, Palmtree, QrCode, Search, Users,
  LayoutDashboard, Vote, CalendarDays, CheckSquare, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useDirectorio, useIniciarDirecta, useNoLeidosTotal } from "@/hooks/useChat";
import type { PerfilMuro } from "@/hooks/useMuro";
import { useEncuestasPendientes } from "@/hooks/useEncuestas";
import { useGrupos } from "@/hooks/useGrupos";
import { horario, useProximosEventos } from "@/hooks/useEventos";
import { UserAvatar, nombreCompleto } from "@/components/muro/MuroComponents";

interface Acceso { label: string; to: string; icon: LucideIcon; color: string; badge?: number }

/** Columna izquierda: perfil y accesos a lo que más se usa, con íconos grandes y de color. */
export function AccesosRapidos({ perfil }: { perfil?: PerfilMuro | null }) {
  const { data: grupos = [] } = useGrupos();
  const misGrupos = grupos.filter((g) => g.soy_miembro).slice(0, 6);
  const { data: role } = useUserRole();
  const noLeidos = useNoLeidosTotal();
  const encuestas = useEncuestasPendientes();
  const gestion = !!role && !["empleado", "registro_asistencia"].includes(role);

  const accesos: Acceso[] = [
    { label: "Mensajes", to: "/mensajes", icon: MessageCircle, color: "bg-primary/15 text-primary", badge: noLeidos },
    { label: "Encuestas", to: "/encuestas", icon: Vote, color: "bg-violet-500/15 text-violet-600 dark:text-violet-400", badge: encuestas },
    { label: "Tareas", to: "/tareas", icon: CheckSquare, color: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
    { label: "Eventos", to: "/eventos", icon: CalendarDays, color: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
    ...(role !== "contador" ? [
      { label: "Fichar", to: "/autogestion?tab=token", icon: QrCode, color: "bg-success/15 text-success" },
      { label: "Mis recibos", to: "/autogestion?tab=recibos", icon: DollarSign, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
      { label: "Vacaciones", to: "/autogestion?tab=vacaciones", icon: Palmtree, color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
      { label: "Permisos", to: "/autogestion?tab=permisos", icon: ClipboardList, color: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
    ] : []),
    ...(gestion ? [
      { label: "Dashboard", to: "/app", icon: LayoutDashboard, color: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
      { label: "Legajos", to: "/legajos", icon: FileText, color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    ] : []),
  ];

  return (
    <nav aria-label="Accesos rápidos" className="space-y-1">
      {role !== "contador" && (
        <Link to="/autogestion?tab=datos" className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-card">
          <UserAvatar perfil={perfil} size="sm" />
          <span className="truncate text-[15px] font-semibold">{nombreCompleto(perfil)}</span>
        </Link>
      )}
      {accesos.map((a) => (
        <Link key={a.to} to={a.to} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-card">
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", a.color)}><a.icon className="h-5 w-5" /></span>
          <span className="flex-1 text-[15px] font-medium">{a.label}</span>
          {!!a.badge && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
              {a.badge > 99 ? "99+" : a.badge}
            </span>
          )}
        </Link>
      ))}
      <div className="mt-4 border-t pt-3">
        <div className="mb-1 flex items-center justify-between px-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tus grupos</p>
          <Link to="/grupos" className="text-xs font-medium text-primary hover:underline">Ver todos</Link>
        </div>
        {misGrupos.length === 0 ? (
          <Link to="/grupos" className="block px-2 py-1.5 text-sm text-muted-foreground hover:underline">Explorar grupos</Link>
        ) : misGrupos.map((g) => (
          <Link key={g.id} to={`/grupos/${g.id}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-card">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: g.color }}>
              {g.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
            </span>
            <span className="truncate text-sm font-medium">{g.nombre}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Accesos rápidos en el celular: fila de botones redondos deslizable. */
export function AccesosRapidosMovil() {
  const { data: role } = useUserRole();
  const noLeidos = useNoLeidosTotal();
  const encuestas = useEncuestasPendientes();
  const items: Acceso[] = [
    { label: "Mensajes", to: "/mensajes", icon: MessageCircle, color: "bg-primary/15 text-primary", badge: noLeidos },
    { label: "Encuestas", to: "/encuestas", icon: Vote, color: "bg-violet-500/15 text-violet-600 dark:text-violet-400", badge: encuestas },
    { label: "Tareas", to: "/tareas", icon: CheckSquare, color: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
    { label: "Eventos", to: "/eventos", icon: CalendarDays, color: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
    { label: "Grupos", to: "/grupos", icon: Users, color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
    ...(role !== "contador" ? [
      { label: "Fichar", to: "/autogestion?tab=token", icon: QrCode, color: "bg-success/15 text-success" },
      { label: "Recibos", to: "/autogestion?tab=recibos", icon: DollarSign, color: "bg-emerald-500/15 text-emerald-600" },
      { label: "Vacaciones", to: "/autogestion?tab=vacaciones", icon: Palmtree, color: "bg-orange-500/15 text-orange-600" },
      { label: "Permisos", to: "/autogestion?tab=permisos", icon: ClipboardList, color: "bg-violet-500/15 text-violet-600" },
    ] : []),
  ];
  return (
    <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 scrollbar-none lg:hidden">
      {items.map((a) => (
        <Link key={a.to} to={a.to} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
          <span className={cn("relative flex h-14 w-14 items-center justify-center rounded-2xl", a.color)}>
            <a.icon className="h-6 w-6" />
            {!!a.badge && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {a.badge > 9 ? "9+" : a.badge}
              </span>
            )}
          </span>
          <span className="text-[11px] font-medium text-center leading-tight">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

/** Columna derecha: compañeros para chatear con un clic. */
export function ContactosCard() {
  const { data: personas = [], isLoading } = useDirectorio();
  const iniciar = useIniciarDirecta();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const lista = personas
    .filter((p) => `${p.nombre} ${p.apellido} ${p.puesto ?? ""}`.toLowerCase().includes(busqueda.toLowerCase()))
    .slice(0, 12);

  const abrir = (userId: string) => iniciar.mutate(userId, {
    onSuccess: (id) => navigate(`/mensajes/${id}`),
    onError: () => toast.error("No se pudo abrir el chat"),
  });

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" />Contactos</h3>
        <Link to="/mensajes" className="text-xs font-medium text-primary hover:underline">Ver chats</Link>
      </div>
      {personas.length > 6 && (
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar compañero" className="h-8 rounded-full bg-muted border-0 pl-8 text-sm" />
        </div>
      )}
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">{busqueda ? "Sin resultados." : "Todavía no hay compañeros con usuario."}</p>
      ) : (
        <ul className="-mx-2">
          {lista.map((p) => (
            <li key={p.user_id}>
              <button
                type="button"
                onClick={() => abrir(p.user_id)}
                disabled={iniciar.isPending}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-muted"
                title={`Enviar mensaje a ${nombreCompleto(p)}`}
              >
                <UserAvatar perfil={p} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{nombreCompleto(p)}</span>
                  {p.puesto && <span className="block truncate text-[11px] text-muted-foreground">{p.puesto}</span>}
                </span>
                <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Columna derecha del muro: próximos eventos. */
export function ProximosEventosCard() {
  const { data: eventos = [], isLoading } = useProximosEventos(4);
  if (!isLoading && eventos.length === 0) return null;
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-sky-500" />Próximos eventos</h3>
        <Link to="/eventos" className="text-xs font-medium text-primary hover:underline">Ver calendario</Link>
      </div>
      {isLoading ? <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div> : (
        <ul className="space-y-2">
          {eventos.map((e) => {
            const d = new Date(e.inicio);
            return (
              <li key={e.id}>
                <Link to={`/eventos?evento=${e.id}`} className="flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-muted">
                  <span className="flex w-10 shrink-0 flex-col items-center rounded-lg bg-sky-500/10 py-0.5 text-sky-700 dark:text-sky-300">
                    <span className="text-[9px] font-semibold uppercase">{d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "")}</span>
                    <span className="text-base font-bold leading-tight">{d.getDate()}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.titulo}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{horario(e)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
