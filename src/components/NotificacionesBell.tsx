import { useState } from "react";
import { Bell, BellRing, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { pedirPermisoAvisos, permisoAvisos, setSonidosActivos, sonar, sonidosActivos } from "@/lib/avisos";
import { useNotificaciones, useMarcarLeida, useMarcarTodasLeidas } from "@/hooks/useNotificaciones";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function NotificacionesBell() {
  const { data: notifs = [] } = useNotificaciones();
  const marcarLeida = useMarcarLeida();
  const marcarTodas = useMarcarTodasLeidas();
  const navigate = useNavigate();
  const noLeidas = notifs.filter((n: any) => !n.leida).length;
  const [conSonido, setConSonido] = useState(sonidosActivos);
  const [permiso, setPermiso] = useState(permisoAvisos);

  const cambiarSonido = (v: boolean) => {
    setSonidosActivos(v);
    setConSonido(v);
    if (v) sonar("aviso");
  };
  const activarAvisos = async () => {
    const r = await pedirPermisoAvisos();
    setPermiso(r);
    if (r === "granted") toast.success("Listo: te avisamos aunque la app esté en segundo plano.");
    else if (r === "denied") toast.error("Los avisos están bloqueados. Habilitalos desde los ajustes del navegador para este sitio.");
  };
  const esIphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada = window.matchMedia?.("(display-mode: standalone)").matches;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors" aria-label={noLeidas ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}>
          <Bell className="h-4 w-4 text-muted-foreground" />
          {noLeidas > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-1.5rem))] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-medium">Notificaciones</p>
          {noLeidas > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => marcarTodas.mutate()}>
              Marcar todas leídas
            </Button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin notificaciones</p>
          ) : (
            notifs.slice(0, 20).map((n: any) => (
              <div
                key={n.id}
                className={cn(
                  "px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors",
                  !n.leida && "bg-primary/5"
                )}
                onClick={() => {
                  if (!n.leida) marcarLeida.mutate(n.id);
                  if (n.link) navigate(n.link);
                }}
              >
                <p className="text-sm font-medium">{n.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.mensaje}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2 border-t bg-muted/40 px-4 py-3 text-xs">
          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">{conSonido ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}Sonidos de mensajes y avisos</span>
            <Switch checked={conSonido} onCheckedChange={cambiarSonido} aria-label="Sonidos" />
          </label>
          {permiso === "granted" ? (
            <p className="flex items-center gap-1.5 text-muted-foreground"><BellRing className="h-3.5 w-3.5 text-success" />Avisos del sistema activados en este dispositivo</p>
          ) : permiso === "no-disponible" ? (
            <p className="text-muted-foreground">{esIphone && !instalada ? "En iPhone, instalá la app (Compartir → Agregar a inicio) para recibir avisos." : "Este navegador no permite avisos del sistema."}</p>
          ) : (
            <Button variant="outline" size="sm" className="h-8 w-full text-xs" onClick={activarAvisos}>
              <BellRing className="mr-1.5 h-3.5 w-3.5" />{permiso === "denied" ? "Avisos bloqueados: ver cómo habilitarlos" : "Recibir avisos con la app en segundo plano"}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
