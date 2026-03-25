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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  // Personal
  nacionalidad: z.string().max(50).optional().or(z.literal("")),
  fecha_nacimiento: z.string().optional().or(z.literal("")),
  sexo: z.string().max(20).optional().or(z.literal("")),
  estado_civil: z.string().max(30).optional().or(z.literal("")),
  // Domicilio
  domicilio_calle: z.string().max(200).optional().or(z.literal("")),
  domicilio_numero: z.string().max(20).optional().or(z.literal("")),
  domicilio_piso: z.string().max(20).optional().or(z.literal("")),
  domicilio_localidad: z.string().max(100).optional().or(z.literal("")),
  domicilio_provincia: z.string().max(100).optional().or(z.literal("")),
  domicilio_cp: z.string().max(10).optional().or(z.literal("")),
  sueldo_basico: z.string().optional().or(z.literal("")),
  codigo_asistencia: z.string().max(20).optional().or(z.literal("")),
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
      nacionalidad: "", fecha_nacimiento: "", sexo: "", estado_civil: "",
      domicilio_calle: "", domicilio_numero: "", domicilio_piso: "",
      domicilio_localidad: "", domicilio_provincia: "", domicilio_cp: "",
      sueldo_basico: "",
      codigo_asistencia: "",
    },
  });

  const empresaId = form.watch("empresa_id");
  const { data: sucursales = [] } = useSucursales(empresaId);

  useEffect(() => {
    if (open && empleado) {
      form.reset({
        nombre: empleado.nombre, apellido: empleado.apellido,
        legajo: empleado.legajo, dni: empleado.dni, cuil: empleado.cuil,
        puesto: empleado.puesto, categoria: empleado.categoria ?? "",
        cct: empleado.cct ?? "", fecha_ingreso: empleado.fecha_ingreso,
        estado: empleado.estado, empresa_id: empleado.empresa_id,
        sucursal_id: empleado.sucursal_id,
        email: empleado.email ?? "", telefono: empleado.telefono ?? "",
        nacionalidad: empleado.nacionalidad ?? "",
        fecha_nacimiento: empleado.fecha_nacimiento ?? "",
        sexo: empleado.sexo ?? "",
        estado_civil: empleado.estado_civil ?? "",
        domicilio_calle: empleado.domicilio_calle ?? "",
        domicilio_numero: empleado.domicilio_numero ?? "",
        domicilio_piso: empleado.domicilio_piso ?? "",
        domicilio_localidad: empleado.domicilio_localidad ?? "",
        domicilio_provincia: empleado.domicilio_provincia ?? "",
        domicilio_cp: empleado.domicilio_cp ?? "",
        sueldo_basico: empleado.sueldo_basico != null ? String(empleado.sueldo_basico) : "",
        codigo_asistencia: (empleado as any).codigo_asistencia ?? "",
      });
    } else if (open) {
      form.reset();
    }
  }, [open, empleado, form]);

  useEffect(() => {
    if (!empleado || empresaId !== empleado.empresa_id) {
      form.setValue("sucursal_id", "");
    }
  }, [empresaId, empleado, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        nombre: values.nombre, apellido: values.apellido,
        legajo: values.legajo, dni: values.dni, cuil: values.cuil,
        puesto: values.puesto, categoria: values.categoria || null,
        cct: values.cct || null, fecha_ingreso: values.fecha_ingreso,
        estado: values.estado, empresa_id: values.empresa_id,
        sucursal_id: values.sucursal_id,
        email: values.email || null, telefono: values.telefono || null,
        nacionalidad: values.nacionalidad || null,
        fecha_nacimiento: values.fecha_nacimiento || null,
        sexo: values.sexo || null,
        estado_civil: values.estado_civil || null,
        domicilio_calle: values.domicilio_calle || null,
        domicilio_numero: values.domicilio_numero || null,
        domicilio_piso: values.domicilio_piso || null,
        domicilio_localidad: values.domicilio_localidad || null,
        domicilio_provincia: values.domicilio_provincia || null,
        domicilio_cp: values.domicilio_cp || null,
        sueldo_basico: values.sueldo_basico ? Number(values.sueldo_basico) : null,
        codigo_asistencia: values.codigo_asistencia || null,
      };
      if (empleado) {
        const { error } = await supabase.from("empleados").update(payload).eq("id", empleado.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("empleados").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(empleado ? "Empleado actualizado" : "Empleado creado");
      queryClient.invalidateQueries({ queryKey: ["empleados"] });
      if (empleado) queryClient.invalidateQueries({ queryKey: ["empleado", empleado.id] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error("Error: " + err.message),
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

        <form onSubmit={onSubmit} className="py-2">
          <Tabs defaultValue="laboral" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="laboral">Laboral</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="domicilio">Domicilio</TabsTrigger>
            </TabsList>

            <TabsContent value="laboral" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Select value={form.watch("estado")} onValueChange={(v) => form.setValue("estado", v as FormValues["estado"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Licencia">Licencia</SelectItem>
                    <SelectItem value="Baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Empresa *" error={form.formState.errors.empresa_id?.message}>
                <Select value={form.watch("empresa_id")} onValueChange={(v) => form.setValue("empresa_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Sucursal *" error={form.formState.errors.sucursal_id?.message}>
                <Select value={form.watch("sucursal_id")} onValueChange={(v) => form.setValue("sucursal_id", v)} disabled={!empresaId}>
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
              <Field label="Sueldo Básico ($)" error={form.formState.errors.sueldo_basico?.message}>
                <Input type="number" step="0.01" {...form.register("sueldo_basico")} placeholder="0.00" />
              </Field>
              <Field label="Cód. Asistencia" error={form.formState.errors.codigo_asistencia?.message}>
                <Input {...form.register("codigo_asistencia")} placeholder="Ej: 1, 3, 20..." />
              </Field>
            </TabsContent>

            <TabsContent value="personal" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nacionalidad">
                <Input {...form.register("nacionalidad")} />
              </Field>
              <Field label="Fecha de Nacimiento">
                <Input type="date" {...form.register("fecha_nacimiento")} />
              </Field>
              <Field label="Sexo">
                <Select value={form.watch("sexo") || ""} onValueChange={(v) => form.setValue("sexo", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Estado Civil">
                <Select value={form.watch("estado_civil") || ""} onValueChange={(v) => form.setValue("estado_civil", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Soltero/a">Soltero/a</SelectItem>
                    <SelectItem value="Casado/a">Casado/a</SelectItem>
                    <SelectItem value="Divorciado/a">Divorciado/a</SelectItem>
                    <SelectItem value="Viudo/a">Viudo/a</SelectItem>
                    <SelectItem value="Unión convivencial">Unión convivencial</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </TabsContent>

            <TabsContent value="domicilio" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Calle">
                <Input {...form.register("domicilio_calle")} />
              </Field>
              <Field label="Número">
                <Input {...form.register("domicilio_numero")} />
              </Field>
              <Field label="Piso / Depto">
                <Input {...form.register("domicilio_piso")} />
              </Field>
              <Field label="Código Postal">
                <Input {...form.register("domicilio_cp")} />
              </Field>
              <Field label="Localidad">
                <Input {...form.register("domicilio_localidad")} />
              </Field>
              <Field label="Provincia">
                <Input {...form.register("domicilio_provincia")} />
              </Field>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
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
