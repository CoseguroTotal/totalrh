import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

interface EnviarEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo?: string;
  defaultSubject?: string;
  htmlContent: string;
  previewText?: string;
}

export default function EnviarEmailDialog({
  open,
  onOpenChange,
  defaultTo = "",
  defaultSubject = "",
  htmlContent,
  previewText,
}: EnviarEmailDialogProps) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [sending, setSending] = useState(false);

  // Sync defaults when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setTo(defaultTo);
      setSubject(defaultSubject);
    }
    onOpenChange(o);
  };

  const handleSend = async () => {
    if (!to || !subject) {
      toast.error("Completá destinatario y asunto");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { to, subject, html: htmlContent },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Email enviado a ${to}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Error al enviar email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Enviar por Email
          </DialogTitle>
          <DialogDescription>Enviá este documento por email al destinatario.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Destinatario *</Label>
            <Input
              type="email"
              placeholder="email@ejemplo.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Asunto *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          {previewText && (
            <div className="space-y-1.5">
              <Label className="text-xs">Vista previa del contenido</Label>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap">
                {previewText}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-1.5" />
            )}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
