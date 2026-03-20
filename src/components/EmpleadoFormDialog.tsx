import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEmpresas, useSucursales } from "@/hooks/useEmpleados";
import type { EmpleadoConEmpresa } from "@/hooks/useEmpleados";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const schema = z.object({
  nombre: z.string().trim().min(1, "Requerido").max(100),
  apellido: z.string().trim().min(1, "Requerido").max(100),
  legajo: z.string().trim().min(1, "Requerido").max(20),
  dni: z.string().trim().min(7, "DNI inválido").max(10),
  cuil: z.string().trim().min(11, "CUIL inválido").max(13),
  puesto: z.string().trim().min(1, "Requerido").max(100),
  categoria: z.string().trim().max(100).optional().or(z.literal("")),
  cct: z.string().trim().max(50).optional().or(z.literal("")),
  fecha_ingreso: z.string().min(1, "Requerido"),
  estado: z.enum(["Activo", "Licencia", "Baja"]),
  empresa_id: z.string().uuid("Seleccioná una empresa"),
  sucursal_id: z.string().uuid("Seleccioná una sucursal"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().max(20).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleado?: EmpleadoConEmpresa | null;
}

export default function EmpleadoFormDialog({ open, onOpenChange, empleado }: Props) {
  const queryClient = useQueryClient();
  const { data: empresas = [] } = useEmpresas();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: "", apellido: "", legajo: "", dni: "", cuil: "",
      puesto: "", categoria: "", cct: "", fecha_ingreso: "",
      estado: "Activo", empresa_id: "", sucursal_id: "",
      email: "", telefono: "",
    },
  });

  const empresaId = form.watch("empresa_id");
  const { data: sucursales = [] } = useSucursales(empresaId);

  // Reset form when dialog opens/closes or empleado changes
  useEffect(() => {
    if (open && empleado) {
      form.reset({
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        legajo: empleado.legajo,
        dni: empleado.dni,
        cuil: empleado.cuil,
        puesto: empleado.puesto,
        categoria: empleado.categoria ?? "",
        cct: empleado.cct ?? "",
        fecha_ingreso: empleado.fecha_ingreso,
        estado: empleado.estado,
        empresa_id: empleado.empresa_id,
        sucursal_id: empleado.sucursal_id,
        email: empleado.email ?? "",
        telefono: empleado.telefono ?? "",
      });
    } else if (open) {
      form.reset();
    }
  }, [open, empleado, form]);

  // Reset sucursal when empresa changes
  useEffect(() => {
    if (!empleado || empresaId !== empleado.empresa_id) {
      form.setValue("sucursal_id", "");
    }
  }, [empresaId, empleado, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        categoria: values.categoria || null,
        cct: values.cct || null,
        email: values.email || null,
        telefono: values.telefono || null,
      };

      if (empleado) {
        const { error } = await supabase
          .from("empleados")
          .update(payload)
          .eq("id", empleado.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("empleados").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(empleado ? "Empleado actualizado" : "Empleado creado");
      queryClient.invalidateQueries({ queryKey: ["empleados"] });
      if (empleado) {
        queryClient.invalidateQueries({ queryKey: ["empleado", empleado.id] });
      }
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Error: " + err.message);
    },
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{empleado ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
          <DialogDescription>
            {empleado ? "Modificá los datos del legajo." : "Completá los datos para dar de alta un nuevo legajo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <Field label="Nombre *" error={form.formState.errors.nombre?.message}>
            <Input {...form.register("nombre")} />
          </Field>
          <Field label="Apellido *" error={form.formState.errors.apellido?.message}>
            <Input {...form.register("apellido")} />
          </Field>
          <Field label="Legajo *" error={form.formState.errors.legajo?.message}>
            <Input {...form.register("legajo")} />
          </Field>
          <Field label="DNI *" error={form.formState.errors.dni?.message}>
            <Input {...form.register("dni")} />
          </Field>
          <Field label="CUIL *" error={form.formState.errors.cuil?.message}>
            <Input {...form.register("cuil")} />
          </Field>
          <Field label="Puesto *" error={form.formState.errors.puesto?.message}>
            <Input {...form.register("puesto")} />
          </Field>
          <Field label="Categoría" error={form.formState.errors.categoria?.message}>
            <Input {...form.register("categoria")} />
          </Field>
          <Field label="CCT" error={form.formState.errors.cct?.message}>
            <Input {...form.register("cct")} />
          </Field>
          <Field label="Fecha Ingreso *" error={form.formState.errors.fecha_ingreso?.message}>
            <Input type="date" {...form.register("fecha_ingreso")} />
          </Field>
          <Field label="Estado *" error={form.formState.errors.estado?.message}>
            <Select
              value={form.watch("estado")}
              onValueChange={(v) => form.setValue("estado", v as FormValues["estado"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Licencia">Licencia</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Empresa *" error={form.formState.errors.empresa_id?.message}>
            <Select
              value={form.watch("empresa_id")}
              onValueChange={(v) => form.setValue("empresa_id", v)}
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sucursal *" error={form.formState.errors.sucursal_id?.message}>
            <Select
              value={form.watch("sucursal_id")}
              onValueChange={(v) => form.setValue("sucursal_id", v)}
              disabled={!empresaId}
            >
              <SelectTrigger><SelectValue placeholder={empresaId ? "Seleccionar..." : "Elegí empresa primero"} /></SelectTrigger>
              <SelectContent>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Email" error={form.formState.errors.email?.message}>
            <Input type="email" {...form.register("email")} />
          </Field>
          <Field label="Teléfono" error={form.formState.errors.telefono?.message}>
            <Input {...form.register("telefono")} />
          </Field>

          <DialogFooter className="col-span-full pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {empleado ? "Guardar cambios" : "Crear empleado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
