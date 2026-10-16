import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserRound } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useEmpleados } from "@/hooks/useEmpleados";
import { useUserRole } from "@/hooks/useUserRole";
import { seccionesParaRol } from "@/components/navigation";

/** Buscador global (Ctrl/⌘ + K): empleados por nombre, legajo o DNI y accesos a módulos. */
export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: role } = useUserRole();
  const puedeVerLegajos = !!role && !["empleado", "registro_asistencia"].includes(role);
  const { data: empleados = [] } = useEmpleados({ enabled: open && puedeVerLegajos });
  const modulos = seccionesParaRol(role).flatMap((s) => s.items);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ir = (url: string) => { setOpen(false); navigate(url); };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 ml-2 rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/80 transition-colors w-72"
        aria-label="Abrir buscador"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">{puedeVerLegajos ? "Buscar empleado, legajo o módulo…" : "Ir a…"}</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px]">Ctrl K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden p-2 text-muted-foreground"
        aria-label="Buscar"
      >
        <Search className="h-5 w-5" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={puedeVerLegajos ? "Nombre, apellido, legajo o DNI…" : "Buscar módulo…"} />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          {puedeVerLegajos && empleados.length > 0 && (
            <>
              <CommandGroup heading="Empleados">
                {empleados.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`${e.apellido} ${e.nombre} ${e.legajo} ${e.dni}`}
                    onSelect={() => ir(`/legajos/${e.id}`)}
                  >
                    <UserRound className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{e.apellido}, {e.nombre}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">Leg. {e.legajo}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          <CommandGroup heading="Ir a">
            {modulos.map((m) => (
              <CommandItem key={m.url} value={`${m.title} ${m.desc}`} onSelect={() => ir(m.url)}>
                <m.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{m.title}</span>
                <span className="ml-2 text-xs text-muted-foreground truncate">{m.desc}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
