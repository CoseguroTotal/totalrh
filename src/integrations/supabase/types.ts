export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      conceptos_liquidacion: {
        Row: {
          activo: boolean
          aplica_a: string
          codigo: string
          created_at: string
          id: string
          monto_fijo: number | null
          nombre: string
          porcentaje: number | null
          tipo: Database["public"]["Enums"]["tipo_concepto"]
        }
        Insert: {
          activo?: boolean
          aplica_a?: string
          codigo: string
          created_at?: string
          id?: string
          monto_fijo?: number | null
          nombre: string
          porcentaje?: number | null
          tipo: Database["public"]["Enums"]["tipo_concepto"]
        }
        Update: {
          activo?: boolean
          aplica_a?: string
          codigo?: string
          created_at?: string
          id?: string
          monto_fijo?: number | null
          nombre?: string
          porcentaje?: number | null
          tipo?: Database["public"]["Enums"]["tipo_concepto"]
        }
        Relationships: []
      }
      datos_medicos: {
        Row: {
          alergias: string | null
          art: string | null
          created_at: string
          empleado_id: string
          grupo_sanguineo: string | null
          id: string
          nro_afiliado: string | null
          nro_art: string | null
          obra_social: string | null
          observaciones: string | null
          plan_obra_social: string | null
          updated_at: string
        }
        Insert: {
          alergias?: string | null
          art?: string | null
          created_at?: string
          empleado_id: string
          grupo_sanguineo?: string | null
          id?: string
          nro_afiliado?: string | null
          nro_art?: string | null
          obra_social?: string | null
          observaciones?: string | null
          plan_obra_social?: string | null
          updated_at?: string
        }
        Update: {
          alergias?: string | null
          art?: string | null
          created_at?: string
          empleado_id?: string
          grupo_sanguineo?: string | null
          id?: string
          nro_afiliado?: string | null
          nro_art?: string | null
          obra_social?: string | null
          observaciones?: string | null
          plan_obra_social?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "datos_medicos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: true
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_legajo: {
        Row: {
          categoria: string | null
          created_at: string
          empleado_id: string
          fecha_vencimiento: string | null
          id: string
          nombre_archivo: string
          storage_path: string
          tamano: string | null
          tipo_documento: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          empleado_id: string
          fecha_vencimiento?: string | null
          id?: string
          nombre_archivo: string
          storage_path: string
          tamano?: string | null
          tipo_documento?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          empleado_id?: string
          fecha_vencimiento?: string | null
          id?: string
          nombre_archivo?: string
          storage_path?: string
          tamano?: string | null
          tipo_documento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_legajo_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados: {
        Row: {
          apellido: string
          avatar_url: string | null
          categoria: string | null
          cct: string | null
          created_at: string
          cuil: string
          dni: string
          domicilio_calle: string | null
          domicilio_cp: string | null
          domicilio_localidad: string | null
          domicilio_numero: string | null
          domicilio_piso: string | null
          domicilio_provincia: string | null
          email: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_empleado"]
          estado_civil: string | null
          fecha_ingreso: string
          fecha_nacimiento: string | null
          id: string
          legajo: string
          nacionalidad: string | null
          nombre: string
          puesto: string
          sexo: string | null
          sucursal_id: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          apellido: string
          avatar_url?: string | null
          categoria?: string | null
          cct?: string | null
          created_at?: string
          cuil: string
          dni: string
          domicilio_calle?: string | null
          domicilio_cp?: string | null
          domicilio_localidad?: string | null
          domicilio_numero?: string | null
          domicilio_piso?: string | null
          domicilio_provincia?: string | null
          email?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_empleado"]
          estado_civil?: string | null
          fecha_ingreso: string
          fecha_nacimiento?: string | null
          id?: string
          legajo: string
          nacionalidad?: string | null
          nombre: string
          puesto: string
          sexo?: string | null
          sucursal_id: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          apellido?: string
          avatar_url?: string | null
          categoria?: string | null
          cct?: string | null
          created_at?: string
          cuil?: string
          dni?: string
          domicilio_calle?: string | null
          domicilio_cp?: string | null
          domicilio_localidad?: string | null
          domicilio_numero?: string | null
          domicilio_piso?: string | null
          domicilio_provincia?: string | null
          email?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_empleado"]
          estado_civil?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          id?: string
          legajo?: string
          nacionalidad?: string | null
          nombre?: string
          puesto?: string
          sexo?: string | null
          sucursal_id?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          actividad_principal: string | null
          convenio_colectivo: string | null
          cp: string | null
          created_at: string
          cuit: string | null
          domicilio_fiscal: string | null
          email: string | null
          fecha_inicio_actividades: string | null
          id: string
          localidad: string | null
          nombre: string
          provincia: string | null
          razon_social: string | null
          telefono: string | null
        }
        Insert: {
          actividad_principal?: string | null
          convenio_colectivo?: string | null
          cp?: string | null
          created_at?: string
          cuit?: string | null
          domicilio_fiscal?: string | null
          email?: string | null
          fecha_inicio_actividades?: string | null
          id?: string
          localidad?: string | null
          nombre: string
          provincia?: string | null
          razon_social?: string | null
          telefono?: string | null
        }
        Update: {
          actividad_principal?: string | null
          convenio_colectivo?: string | null
          cp?: string | null
          created_at?: string
          cuit?: string | null
          domicilio_fiscal?: string | null
          email?: string | null
          fecha_inicio_actividades?: string | null
          id?: string
          localidad?: string | null
          nombre?: string
          provincia?: string | null
          razon_social?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      estudios_empleado: {
        Row: {
          created_at: string
          empleado_id: string
          estado: Database["public"]["Enums"]["estado_estudio"]
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          institucion: string | null
          nivel: Database["public"]["Enums"]["nivel_estudio"]
          titulo: string
        }
        Insert: {
          created_at?: string
          empleado_id: string
          estado?: Database["public"]["Enums"]["estado_estudio"]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion?: string | null
          nivel: Database["public"]["Enums"]["nivel_estudio"]
          titulo: string
        }
        Update: {
          created_at?: string
          empleado_id?: string
          estado?: Database["public"]["Enums"]["estado_estudio"]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion?: string | null
          nivel?: Database["public"]["Enums"]["nivel_estudio"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudios_empleado_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_legajo: {
        Row: {
          created_at: string
          descripcion: string | null
          empleado_id: string
          fecha: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_evento_legajo"]
          titulo: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          empleado_id: string
          fecha: string
          id?: string
          tipo: Database["public"]["Enums"]["tipo_evento_legajo"]
          titulo: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          empleado_id?: string
          fecha?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_evento_legajo"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_legajo_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      fichadas: {
        Row: {
          created_at: string
          empleado_id: string
          estado: string
          fecha: string
          hora_entrada: string | null
          hora_salida: string | null
          id: string
          observaciones: string | null
          turno_id: string | null
        }
        Insert: {
          created_at?: string
          empleado_id: string
          estado?: string
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          observaciones?: string | null
          turno_id?: string | null
        }
        Update: {
          created_at?: string
          empleado_id?: string
          estado?: string
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          observaciones?: string | null
          turno_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichadas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichadas_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_familiar: {
        Row: {
          a_cargo: boolean
          apellido: string
          created_at: string
          discapacidad: boolean
          dni: string | null
          empleado_id: string
          fecha_nacimiento: string | null
          id: string
          nombre: string
          parentesco: Database["public"]["Enums"]["parentesco_familiar"]
        }
        Insert: {
          a_cargo?: boolean
          apellido: string
          created_at?: string
          discapacidad?: boolean
          dni?: string | null
          empleado_id: string
          fecha_nacimiento?: string | null
          id?: string
          nombre: string
          parentesco: Database["public"]["Enums"]["parentesco_familiar"]
        }
        Update: {
          a_cargo?: boolean
          apellido?: string
          created_at?: string
          discapacidad?: boolean
          dni?: string | null
          empleado_id?: string
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          parentesco?: Database["public"]["Enums"]["parentesco_familiar"]
        }
        Relationships: [
          {
            foreignKeyName: "grupo_familiar_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidacion_lineas: {
        Row: {
          cantidad: number
          concepto_id: string | null
          descripcion: string
          id: string
          liquidacion_id: string
          monto: number
          tipo: Database["public"]["Enums"]["tipo_concepto"]
        }
        Insert: {
          cantidad?: number
          concepto_id?: string | null
          descripcion: string
          id?: string
          liquidacion_id: string
          monto?: number
          tipo: Database["public"]["Enums"]["tipo_concepto"]
        }
        Update: {
          cantidad?: number
          concepto_id?: string | null
          descripcion?: string
          id?: string
          liquidacion_id?: string
          monto?: number
          tipo?: Database["public"]["Enums"]["tipo_concepto"]
        }
        Relationships: [
          {
            foreignKeyName: "liquidacion_lineas_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "conceptos_liquidacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_lineas_liquidacion_id_fkey"
            columns: ["liquidacion_id"]
            isOneToOne: false
            referencedRelation: "liquidaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidaciones: {
        Row: {
          created_at: string
          empleado_id: string
          estado: Database["public"]["Enums"]["estado_liquidacion"]
          id: string
          neto: number
          periodo: string
          sueldo_basico: number
          total_deducciones: number
          total_no_remunerativo: number
          total_remunerativo: number
        }
        Insert: {
          created_at?: string
          empleado_id: string
          estado?: Database["public"]["Enums"]["estado_liquidacion"]
          id?: string
          neto?: number
          periodo: string
          sueldo_basico?: number
          total_deducciones?: number
          total_no_remunerativo?: number
          total_remunerativo?: number
        }
        Update: {
          created_at?: string
          empleado_id?: string
          estado?: Database["public"]["Enums"]["estado_liquidacion"]
          id?: string
          neto?: number
          periodo?: string
          sueldo_basico?: number
          total_deducciones?: number
          total_no_remunerativo?: number
          total_remunerativo?: number
        }
        Relationships: [
          {
            foreignKeyName: "liquidaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      novedades_asistencia: {
        Row: {
          created_at: string
          descripcion: string | null
          empleado_id: string
          fecha: string
          id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          empleado_id: string
          fecha: string
          id?: string
          tipo: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          empleado_id?: string
          fecha?: string
          id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "novedades_asistencia_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_permiso: {
        Row: {
          aprobado_por: string | null
          created_at: string
          empleado_id: string
          estado: Database["public"]["Enums"]["estado_solicitud"]
          fecha_desde: string
          fecha_hasta: string
          fecha_solicitud: string
          hora_reintegro: string | null
          id: string
          motivo: string
          motivo_detalle: string | null
          observaciones: string | null
          sujeto_descuento: boolean
        }
        Insert: {
          aprobado_por?: string | null
          created_at?: string
          empleado_id: string
          estado?: Database["public"]["Enums"]["estado_solicitud"]
          fecha_desde: string
          fecha_hasta: string
          fecha_solicitud?: string
          hora_reintegro?: string | null
          id?: string
          motivo: string
          motivo_detalle?: string | null
          observaciones?: string | null
          sujeto_descuento?: boolean
        }
        Update: {
          aprobado_por?: string | null
          created_at?: string
          empleado_id?: string
          estado?: Database["public"]["Enums"]["estado_solicitud"]
          fecha_desde?: string
          fecha_hasta?: string
          fecha_solicitud?: string
          hora_reintegro?: string | null
          id?: string
          motivo?: string
          motivo_detalle?: string | null
          observaciones?: string | null
          sujeto_descuento?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_permiso_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      sucursales: {
        Row: {
          created_at: string
          direccion: string | null
          empresa_id: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          empresa_id: string
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          direccion?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "sucursales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos: {
        Row: {
          created_at: string
          hora_entrada: string
          hora_salida: string
          id: string
          nombre: string
          tolerancia_minutos: number
        }
        Insert: {
          created_at?: string
          hora_entrada: string
          hora_salida: string
          id?: string
          nombre: string
          tolerancia_minutos?: number
        }
        Update: {
          created_at?: string
          hora_entrada?: string
          hora_salida?: string
          id?: string
          nombre?: string
          tolerancia_minutos?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_empleado: "Activo" | "Licencia" | "Baja"
      estado_estudio: "completo" | "en_curso" | "incompleto"
      estado_liquidacion: "borrador" | "confirmada"
      estado_solicitud: "pendiente" | "aprobada" | "rechazada"
      nivel_estudio:
        | "primario"
        | "secundario"
        | "terciario"
        | "universitario"
        | "posgrado"
      parentesco_familiar: "conyuge" | "hijo" | "padre" | "otro"
      tipo_concepto: "remunerativo" | "no_remunerativo" | "deduccion"
      tipo_evento_legajo:
        | "ingreso"
        | "promocion"
        | "sancion"
        | "licencia"
        | "cambio"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_empleado: ["Activo", "Licencia", "Baja"],
      estado_estudio: ["completo", "en_curso", "incompleto"],
      estado_liquidacion: ["borrador", "confirmada"],
      estado_solicitud: ["pendiente", "aprobada", "rechazada"],
      nivel_estudio: [
        "primario",
        "secundario",
        "terciario",
        "universitario",
        "posgrado",
      ],
      parentesco_familiar: ["conyuge", "hijo", "padre", "otro"],
      tipo_concepto: ["remunerativo", "no_remunerativo", "deduccion"],
      tipo_evento_legajo: [
        "ingreso",
        "promocion",
        "sancion",
        "licencia",
        "cambio",
      ],
    },
  },
} as const
