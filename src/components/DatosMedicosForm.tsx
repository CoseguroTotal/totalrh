import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DatosMedicos {
  id: string;
  grupo_sanguineo: string | null;
  obra_social: string | null;
  plan_obra_social: string | null;
  nro_afiliado: string | null;
  art: string | null;
  nro_art: string | null;
  alergias: string | null;
  observaciones: string | null;
}

interface Props {
  empleadoId: string;
  datos: DatosMedicos | null;
  isLoading: boolean;
}

export default function DatosMedicosForm({ empleadoId, datos, isLoading }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    grupo_sanguineo: "", obra_social: "", plan_obra_social: "",
    nro_afiliado: "", art: "", nro_art: "", alergias: "", observaciones: "",
  });

  useEffect(() => {
    if (datos) {
      setForm({
        grupo_sanguineo: datos.grupo_sanguineo ?? "",
        obra_social: datos.obra_social ?? "",
        plan_obra_social: datos.plan_obra_social ?? "",
        nro_afiliado: datos.nro_afiliado ?? "",
        art: datos.art ?? "",
        nro_art: datos.nro_art ?? "",
        alergias: datos.alergias ?? "",
        observaciones: datos.observaciones ?? "",
      });
    }
  }, [datos]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        empleado_id: empleadoId,
        grupo_sanguineo: form.grupo_sanguineo || null,
        obra_social: form.obra_social || null,
        plan_obra_social: form.plan_obra_social || null,
        nro_afiliado: form.nro_afiliado || null,
        art: form.art || null,
        nro_art: form.nro_art || null,
        alergias: form.alergias || null,
        observaciones: form.observaciones || null,
      };
      if (datos) {
        const { error } = await supabase.from("datos_medicos").update(payload).eq("id", datos.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("datos_medicos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Datos médicos actualizados");
      queryClient.invalidateQueries({ queryKey: ["datos_medicos", empleadoId] });
      setEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  const fields = [
    { key: "grupo_sanguineo", label: "Grupo Sanguíneo" },
    { key: "obra_social", label: "Obra Social" },
    { key: "plan_obra_social", label: "Plan" },
    { key: "nro_afiliado", label: "N° Afiliado" },
    { key: "art", label: "ART" },
    { key: "nro_art", label: "N° ART" },
  ];

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Datos Médicos</h4>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />Editar
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <p className="text-xs text-muted-foreground">{f.label}</p>
              <p className="text-sm mt-0.5">{(form as any)[f.key] || "—"}</p>
            </div>
          ))}
        </div>
        {(form.alergias || form.observaciones) && (
          <div className="mt-3 space-y-2">
            {form.alergias && <div><p className="text-xs text-muted-foreground">Alergias</p><p className="text-sm">{form.alergias}</p></div>}
            {form.observaciones && <div><p className="text-xs text-muted-foreground">Observaciones</p><p className="text-sm">{form.observaciones}</p></div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Datos Médicos</h4>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /></Button>
          <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Guardar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs">{f.label}</Label>
            <Input
              className="h-8 text-sm"
              value={(form as any)[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <div className="space-y-1">
          <Label className="text-xs">Alergias</Label>
          <Textarea rows={2} value={form.alergias} onChange={(e) => setForm({ ...form, alergias: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Observaciones</Label>
          <Textarea rows={2} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
