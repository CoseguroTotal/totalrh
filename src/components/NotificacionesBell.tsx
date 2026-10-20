import { Bell } from "lucide-react";
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {noLeidas > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
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
      </PopoverContent>
    </Popover>
  );
}
