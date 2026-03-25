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
      asignaciones_turno: {
        Row: {
          created_at: string
          dia_semana: number
          empleado_id: string
          hora_entrada: string
          hora_salida: string
          id: string
          vigente_desde: string
        }
        Insert: {
          created_at?: string
          dia_semana: number
          empleado_id: string
          hora_entrada: string
          hora_salida: string
          id?: string
          vigente_desde?: string
        }
        Update: {
          created_at?: string
          dia_semana?: number
          empleado_id?: string
          hora_entrada?: string
          hora_salida?: string
          id?: string
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_turno_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos: {
        Row: {
          created_at: string
          cv_url: string | null
          email: string | null
          estado: Database["public"]["Enums"]["estado_candidato"]
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
          vacante_id: string
        }
        Insert: {
          created_at?: string
          cv_url?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_candidato"]
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
          vacante_id: string
        }
        Update: {
          created_at?: string
          cv_url?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_candidato"]
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
          vacante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_vacante_id_fkey"
            columns: ["vacante_id"]
            isOneToOne: false
            referencedRelation: "vacantes"
            referencedColumns: ["id"]
          },
        ]
      }
      conceptos_liquidacion: {
        Row: {
          activo: boolean
          aplica_a: string
          base_calculo: string | null
          cantidad_default: number | null
          codigo: string
          concepto_base_id: string | null
          created_at: string
          grupo: string | null
          id: string
          monto_fijo: number | null
          nombre: string
          orden: number | null
          porcentaje: number | null
          tipo: Database["public"]["Enums"]["tipo_concepto"]
          unidad: string | null
        }
        Insert: {
          activo?: boolean
          aplica_a?: string
          base_calculo?: string | null
          cantidad_default?: number | null
          codigo: string
          concepto_base_id?: string | null
          created_at?: string
          grupo?: string | null
          id?: string
          monto_fijo?: number | null
          nombre: string
          orden?: number | null
          porcentaje?: number | null
          tipo: Database["public"]["Enums"]["tipo_concepto"]
          unidad?: string | null
        }
        Update: {
          activo?: boolean
          aplica_a?: string
          base_calculo?: string | null
          cantidad_default?: number | null
          codigo?: string
          concepto_base_id?: string | null
          created_at?: string
          grupo?: string | null
          id?: string
          monto_fijo?: number | null
          nombre?: string
          orden?: number | null
          porcentaje?: number | null
          tipo?: Database["public"]["Enums"]["tipo_concepto"]
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conceptos_liquidacion_concepto_base_id_fkey"
            columns: ["concepto_base_id"]
            isOneToOne: false
            referencedRelation: "conceptos_liquidacion"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_grupo: {
        Row: {
          cuit: string | null
          domicilio: string | null
          email: string | null
          email_remitente: string | null
          id: string
          logo_url: string | null
          nombre_grupo: string
          notificaciones_email_activas: boolean | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          cuit?: string | null
          domicilio?: string | null
          email?: string | null
          email_remitente?: string | null
          id?: string
          logo_url?: string | null
          nombre_grupo?: string
          notificaciones_email_activas?: boolean | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          cuit?: string | null
          domicilio?: string | null
          email?: string | null
          email_remitente?: string | null
          id?: string
          logo_url?: string | null
          nombre_grupo?: string
          notificaciones_email_activas?: boolean | null
          telefono?: string | null
          updated_at?: string
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
          codigo_asistencia: string | null
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
          sueldo_basico: number | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          apellido: string
          avatar_url?: string | null
          categoria?: string | null
          cct?: string | null
          codigo_asistencia?: string | null
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
          sueldo_basico?: number | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          apellido?: string
          avatar_url?: string | null
          categoria?: string | null
          cct?: string | null
          codigo_asistencia?: string | null
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
          sueldo_basico?: number | null
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
          logo_url: string | null
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
          logo_url?: string | null
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
          logo_url?: string | null
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
          base: number | null
          cantidad: number
          concepto_id: string | null
          descripcion: string
          es_haber: boolean | null
          id: string
          liquidacion_id: string
          monto: number
          tipo: Database["public"]["Enums"]["tipo_concepto"]
        }
        Insert: {
          base?: number | null
          cantidad?: number
          concepto_id?: string | null
          descripcion: string
          es_haber?: boolean | null
          id?: string
          liquidacion_id: string
          monto?: number
          tipo: Database["public"]["Enums"]["tipo_concepto"]
        }
        Update: {
          base?: number | null
          cantidad?: number
          concepto_id?: string | null
          descripcion?: string
          es_haber?: boolean | null
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
      memorandums: {
        Row: {
          contenido: string
          created_at: string
          created_by: string | null
          destinatario_empleado_id: string | null
          destinatario_nombre: string | null
          empresa_id: string | null
          estado: Database["public"]["Enums"]["estado_memorandum"]
          fecha: string
          fecha_firma: string | null
          firmado_por: string | null
          id: string
          numero: number
          titulo: string
        }
        Insert: {
          contenido?: string
          created_at?: string
          created_by?: string | null
          destinatario_empleado_id?: string | null
          destinatario_nombre?: string | null
          empresa_id?: string | null
          estado?: Database["public"]["Enums"]["estado_memorandum"]
          fecha?: string
          fecha_firma?: string | null
          firmado_por?: string | null
          id?: string
          numero?: number
          titulo: string
        }
        Update: {
          contenido?: string
          created_at?: string
          created_by?: string | null
          destinatario_empleado_id?: string | null
          destinatario_nombre?: string | null
          empresa_id?: string | null
          estado?: Database["public"]["Enums"]["estado_memorandum"]
          fecha?: string
          fecha_firma?: string | null
          firmado_por?: string | null
          id?: string
          numero?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorandums_destinatario_empleado_id_fkey"
            columns: ["destinatario_empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorandums_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          created_at: string
          id: string
          leida: boolean
          link: string | null
          mensaje: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leida?: boolean
          link?: string | null
          mensaje?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leida?: boolean
          link?: string | null
          mensaje?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
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
      sanciones: {
        Row: {
          created_at: string | null
          descargo_cerrado: boolean | null
          descargo_documento_url: string | null
          descargo_fecha: string | null
          descargo_texto: string | null
          descripcion: string | null
          emitido_por: string | null
          empleado_id: string
          fecha: string
          id: string
          motivo: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          descargo_cerrado?: boolean | null
          descargo_documento_url?: string | null
          descargo_fecha?: string | null
          descargo_texto?: string | null
          descripcion?: string | null
          emitido_por?: string | null
          empleado_id: string
          fecha?: string
          id?: string
          motivo: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          descargo_cerrado?: boolean | null
          descargo_documento_url?: string | null
          descargo_fecha?: string | null
          descargo_texto?: string | null
          descripcion?: string | null
          emitido_por?: string | null
          empleado_id?: string
          fecha?: string
          id?: string
          motivo?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanciones_empleado_id_fkey"
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
      solicitudes_vacaciones: {
        Row: {
          aprobado_por: string | null
          created_at: string
          dias_correspondientes: number
          dias_solicitados: number
          empleado_id: string
          estado: Database["public"]["Enums"]["estado_vacacion"]
          fecha_desde: string
          fecha_hasta: string
          id: string
          observaciones: string | null
          periodo_anual: string
        }
        Insert: {
          aprobado_por?: string | null
          created_at?: string
          dias_correspondientes?: number
          dias_solicitados?: number
          empleado_id: string
          estado?: Database["public"]["Enums"]["estado_vacacion"]
          fecha_desde: string
          fecha_hasta: string
          id?: string
          observaciones?: string | null
          periodo_anual?: string
        }
        Update: {
          aprobado_por?: string | null
          created_at?: string
          dias_correspondientes?: number
          dias_solicitados?: number
          empleado_id?: string
          estado?: Database["public"]["Enums"]["estado_vacacion"]
          fecha_desde?: string
          fecha_hasta?: string
          id?: string
          observaciones?: string | null
          periodo_anual?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_vacaciones_empleado_id_fkey"
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
      tokens_asistencia: {
        Row: {
          created_at: string | null
          empleado_id: string
          id: string
          secret: string
        }
        Insert: {
          created_at?: string | null
          empleado_id: string
          id?: string
          secret: string
        }
        Update: {
          created_at?: string | null
          empleado_id?: string
          id?: string
          secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_asistencia_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: true
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens_consumidos: {
        Row: {
          empleado_id: string
          id: string
          token: string
          usado_at: string | null
        }
        Insert: {
          empleado_id: string
          id?: string
          token: string
          usado_at?: string | null
        }
        Update: {
          empleado_id?: string
          id?: string
          token?: string
          usado_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_consumidos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
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
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacaciones_config: {
        Row: {
          anios_antiguedad_max: number
          anios_antiguedad_min: number
          created_at: string
          dias_correspondientes: number
          empresa_id: string
          id: string
        }
        Insert: {
          anios_antiguedad_max?: number
          anios_antiguedad_min?: number
          created_at?: string
          dias_correspondientes?: number
          empresa_id: string
          id?: string
        }
        Update: {
          anios_antiguedad_max?: number
          anios_antiguedad_min?: number
          created_at?: string
          dias_correspondientes?: number
          empresa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacaciones_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vacantes: {
        Row: {
          created_at: string
          created_by: string | null
          descripcion: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_vacante"]
          fecha_publicacion: string | null
          id: string
          requisitos: string | null
          titulo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_vacante"]
          fecha_publicacion?: string | null
          id?: string
          requisitos?: string | null
          titulo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_vacante"]
          fecha_publicacion?: string | null
          id?: string
          requisitos?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "usuario"
        | "contador"
        | "gerente"
        | "rrhh"
        | "empleado"
        | "registro_asistencia"
      estado_candidato:
        | "postulado"
        | "entrevista"
        | "evaluacion"
        | "oferta"
        | "contratado"
        | "descartado"
      estado_empleado: "Activo" | "Licencia" | "Baja"
      estado_estudio: "completo" | "en_curso" | "incompleto"
      estado_liquidacion: "borrador" | "confirmada"
      estado_memorandum: "borrador" | "enviado" | "recibido" | "firmado"
      estado_solicitud: "pendiente" | "aprobada" | "rechazada"
      estado_vacacion: "pendiente" | "aprobada" | "rechazada" | "cancelada"
      estado_vacante: "abierta" | "cerrada" | "pausada"
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
      app_role: [
        "admin",
        "usuario",
        "contador",
        "gerente",
        "rrhh",
        "empleado",
        "registro_asistencia",
      ],
      estado_candidato: [
        "postulado",
        "entrevista",
        "evaluacion",
        "oferta",
        "contratado",
        "descartado",
      ],
      estado_empleado: ["Activo", "Licencia", "Baja"],
      estado_estudio: ["completo", "en_curso", "incompleto"],
      estado_liquidacion: ["borrador", "confirmada"],
      estado_memorandum: ["borrador", "enviado", "recibido", "firmado"],
      estado_solicitud: ["pendiente", "aprobada", "rechazada"],
      estado_vacacion: ["pendiente", "aprobada", "rechazada", "cancelada"],
      estado_vacante: ["abierta", "cerrada", "pausada"],
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
