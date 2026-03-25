import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, Users, Building2, UserCheck } from "lucide-react";

type Modo = "todos" | "empresa" | "manual";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memos: any[];
  empleados: any[];
  empresas: any[];
  config: any;
}

export default function EnvioMasivoMemoDialog({ open, onOpenChange, memos, empleados, empresas, config }: Props) {
  const [modo, setModo] = useState<Modo>("todos");
  const [empresaId, setEmpresaId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [memoId, setMemoId] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });

  const activosConEmail = useMemo(
    () => empleados.filter((e) => e.estado === "Activo" && e.email),
    [empleados]
  );

  const filteredEmpleados = useMemo(() => {
    if (modo === "empresa" && empresaId) return activosConEmail.filter((e) => e.empresa_id === empresaId);
    return activosConEmail;
  }, [modo, empresaId, activosConEmail]);

  const destinatarios = useMemo(() => {
    if (modo === "manual") return activosConEmail.filter((e) => selectedIds.has(e.id));
    return filteredEmpleados;
  }, [modo, filteredEmpleados, selectedIds, activosConEmail]);

  const selectedMemo = memos.find((m) => m.id === memoId);

  const toggleEmpleado = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredEmpleados.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmpleados.map((e) => e.id)));
    }
  };

  const getEmailHtml = (m: any, destinatarioNombre: string) => {
    const empresa = empresas.find((e: any) => e.id === m.empresa_id);
    const nombreEmpresa = empresa?.nombre || config?.nombre_grupo || "Grupo Empresario";
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#333;border-bottom:2px solid #2563eb;padding-bottom:10px;">Memorándum #${m.numero}</h2>
        <p style="color:#666;font-size:14px;"><strong>Empresa:</strong> ${nombreEmpresa}</p>
        <p style="color:#666;font-size:14px;"><strong>Fecha:</strong> ${new Date(m.fecha).toLocaleDateString("es-AR")}</p>
        <p style="color:#666;font-size:14px;"><strong>Para:</strong> ${destinatarioNombre}</p>
        <h3 style="color:#333;margin-top:20px;">${m.titulo}</h3>
        <div style="color:#444;font-size:14px;line-height:1.6;white-space:pre-wrap;">${m.contenido}</div>
        <hr style="margin-top:30px;border:none;border-top:1px solid #ddd;"/>
        <p style="color:#999;font-size:12px;">${nombreEmpresa}</p>
      </div>
    `;
  };

  const handleEnviar = async () => {
    if (!selectedMemo) { toast.error("Seleccioná un memorándum"); return; }
    if (destinatarios.length === 0) { toast.error("No hay destinatarios seleccionados"); return; }

    setSending(true);
    setProgress({ sent: 0, failed: 0, total: destinatarios.length });

    let sent = 0;
    let failed = 0;

    for (const emp of destinatarios) {
      const nombre = `${emp.apellido}, ${emp.nombre}`;
      try {
        const { data, error } = await supabase.functions.invoke("send-email", {
          body: {
            to: emp.email,
            subject: `Memorándum #${selectedMemo.numero} — ${selectedMemo.titulo}`,
            html: getEmailHtml(selectedMemo, nombre),
          },
        });
        if (error || data?.error) throw new Error(data?.error || "Error");
        sent++;
      } catch {
        failed++;
      }
      setProgress({ sent, failed, total: destinatarios.length });
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 300));
    }

    setSending(false);
    if (failed === 0) {
      toast.success(`Enviado exitosamente a ${sent} destinatario${sent > 1 ? "s" : ""}`);
    } else {
      toast.warning(`Enviados: ${sent} · Fallidos: ${failed}`);
    }
    if (failed === 0) onOpenChange(false);
  };

  const resetState = (o: boolean) => {
    if (!o) {
      setModo("todos");
      setEmpresaId("");
      setSelectedIds(new Set());
      setMemoId("");
      setProgress({ sent: 0, failed: 0, total: 0 });
    }
    onOpenChange(o);
  };

  const processed = progress.sent + progress.failed;
  const pct = progress.total > 0 ? (processed / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={resetState}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4" />Envío Masivo de Memorándum</DialogTitle>
          <DialogDescription>Enviá un memorándum por email a múltiples empleados.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Memo selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">Memorándum a enviar *</Label>
            <Select value={memoId} onValueChange={setMemoId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar memorándum..." /></SelectTrigger>
              <SelectContent>
                {memos.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>#{m.numero} — {m.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">Destinatarios</Label>
            <div className="flex gap-2">
              {([
                { value: "todos" as Modo, label: "Todos", icon: Users },
                { value: "empresa" as Modo, label: "Por empresa", icon: Building2 },
                { value: "manual" as Modo, label: "Selección manual", icon: UserCheck },
              ]).map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={modo === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setModo(value); setSelectedIds(new Set()); }}
                  className="flex-1"
                >
                  <Icon className="h-3.5 w-3.5 mr-1" />{label}
                </Button>
              ))}
            </div>
          </div>

          {/* Company selector */}
          {modo === "empresa" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Empresa</Label>
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger>
                <SelectContent>
                  {empresas.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Manual selection */}
          {modo === "manual" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Seleccionar empleados</Label>
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={toggleAll}>
                  {selectedIds.size === filteredEmpleados.length ? "Deseleccionar todos" : "Seleccionar todos"}
                </Button>
              </div>
              <ScrollArea className="h-48 rounded-md border p-2">
                {filteredEmpleados.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 py-1.5 px-1 hover:bg-muted/30 rounded cursor-pointer">
                    <Checkbox
                      checked={selectedIds.has(e.id)}
                      onCheckedChange={() => toggleEmpleado(e.id)}
                    />
                    <span className="text-sm">{e.apellido}, {e.nombre}</span>
                    <span className="text-xs text-muted-foreground ml-auto truncate max-w-[150px]">{e.email}</span>
                  </label>
                ))}
              </ScrollArea>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <span className="font-medium">{destinatarios.length}</span> destinatario{destinatarios.length !== 1 ? "s" : ""} con email
          </div>

          {/* Progress */}
          {sending && (
            <div className="space-y-2">
              <Progress value={pct} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {processed} de {progress.total} · ✓ {progress.sent} · ✗ {progress.failed}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => resetState(false)} disabled={sending}>Cancelar</Button>
          <Button onClick={handleEnviar} disabled={sending || !memoId || destinatarios.length === 0}>
            {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
            {sending ? `Enviando...` : `Enviar a ${destinatarios.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
