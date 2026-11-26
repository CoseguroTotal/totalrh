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
    PostgrestVersion: "14.17"
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
          organizacion_id: string
          vigente_desde: string
        }
        Insert: {
          created_at?: string
          dia_semana: number
          empleado_id: string
          hora_entrada: string
          hora_salida: string
          id?: string
          organizacion_id?: string
          vigente_desde?: string
        }
        Update: {
          created_at?: string
          dia_semana?: number
          empleado_id?: string
          hora_entrada?: string
          hora_salida?: string
          id?: string
          organizacion_id?: string
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_turno_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "asignaciones_turno_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          organizacion_id: string
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
          organizacion_id?: string
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
          organizacion_id?: string
          telefono?: string | null
          vacante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vacante_id_fkey"
            columns: ["organizacion_id", "vacante_id"]
            isOneToOne: false
            referencedRelation: "vacantes"
            referencedColumns: ["organizacion_id", "id"]
          },
        ]
      }
      chat_conversaciones: {
        Row: {
          creada_por: string | null
          created_at: string
          id: string
          nombre: string | null
          organizacion_id: string
          tipo: string
          ultimo_mensaje_at: string
        }
        Insert: {
          creada_por?: string | null
          created_at?: string
          id?: string
          nombre?: string | null
          organizacion_id?: string
          tipo: string
          ultimo_mensaje_at?: string
        }
        Update: {
          creada_por?: string | null
          created_at?: string
          id?: string
          nombre?: string | null
          organizacion_id?: string
          tipo?: string
          ultimo_mensaje_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversaciones_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mensajes: {
        Row: {
          adjunto_duracion: number | null
          adjunto_nombre: string | null
          adjunto_path: string | null
          adjunto_tamano: number | null
          adjunto_tipo: string | null
          autor_id: string
          contenido: string
          conversacion_id: string
          created_at: string
          eliminado: boolean
          id: string
          organizacion_id: string
        }
        Insert: {
          adjunto_duracion?: number | null
          adjunto_nombre?: string | null
          adjunto_path?: string | null
          adjunto_tamano?: number | null
          adjunto_tipo?: string | null
          autor_id?: string
          contenido?: string
          conversacion_id: string
          created_at?: string
          eliminado?: boolean
          id?: string
          organizacion_id?: string
        }
        Update: {
          adjunto_duracion?: number | null
          adjunto_nombre?: string | null
          adjunto_path?: string | null
          adjunto_tamano?: number | null
          adjunto_tipo?: string | null
          autor_id?: string
          contenido?: string
          conversacion_id?: string
          created_at?: string
          eliminado?: boolean
          id?: string
          organizacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_mensajes_conversacion_id_fkey"
            columns: ["organizacion_id", "conversacion_id"]
            isOneToOne: false
            referencedRelation: "chat_conversaciones"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "chat_mensajes_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participantes: {
        Row: {
          conversacion_id: string
          created_at: string
          organizacion_id: string
          ultimo_leido_at: string
          user_id: string
        }
        Insert: {
          conversacion_id: string
          created_at?: string
          organizacion_id?: string
          ultimo_leido_at?: string
          user_id: string
        }
        Update: {
          conversacion_id?: string
          created_at?: string
          organizacion_id?: string
          ultimo_leido_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participantes_conversacion_id_fkey"
            columns: ["organizacion_id", "conversacion_id"]
            isOneToOne: false
            referencedRelation: "chat_conversaciones"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "chat_participantes_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      conceptos_liquidacion: {
        Row: {
          activo: boolean
          aplica_a: string
          aplica_valores: string[]
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
          organizacion_id: string
          porcentaje: number | null
          tipo: Database["public"]["Enums"]["tipo_concepto"]
          tope_base: number | null
          unidad: string | null
        }
        Insert: {
          activo?: boolean
          aplica_a?: string
          aplica_valores?: string[]
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
          organizacion_id?: string
          porcentaje?: number | null
          tipo: Database["public"]["Enums"]["tipo_concepto"]
          tope_base?: number | null
          unidad?: string | null
        }
        Update: {
          activo?: boolean
          aplica_a?: string
          aplica_valores?: string[]
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
          organizacion_id?: string
          porcentaje?: number | null
          tipo?: Database["public"]["Enums"]["tipo_concepto"]
          tope_base?: number | null
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conceptos_liquidacion_concepto_base_id_fkey"
            columns: ["organizacion_id", "concepto_base_id"]
            isOneToOne: false
            referencedRelation: "conceptos_liquidacion"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "conceptos_liquidacion_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_grupo: {
        Row: {
          cuit: string | null
          demo_acceso_dias: number
          demo_bloqueo_minutos: number
          demo_codigo_minutos: number
          demo_max_fallos_ip_hora: number
          demo_max_intentos_codigo: number
          demo_max_solicitudes_ip_hora: number
          divisor_hora: number
          domicilio: string | null
          email: string | null
          email_remitente: string | null
          extra_minimo_minutos: number
          fichado_facial_activo: boolean
          fichado_geo_activo: boolean
          fichado_qr_activo: boolean
          fichado_token_activo: boolean
          geo_exigir_en_qr: boolean
          id: string
          logo_url: string | null
          nombre_grupo: string
          notificaciones_email_activas: boolean | null
          organizacion_id: string
          qr_duracion_segundos: number
          registro_abierto: boolean
          registro_codigo: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          cuit?: string | null
          demo_acceso_dias?: number
          demo_bloqueo_minutos?: number
          demo_codigo_minutos?: number
          demo_max_fallos_ip_hora?: number
          demo_max_intentos_codigo?: number
          demo_max_solicitudes_ip_hora?: number
          divisor_hora?: number
          domicilio?: string | null
          email?: string | null
          email_remitente?: string | null
          extra_minimo_minutos?: number
          fichado_facial_activo?: boolean
          fichado_geo_activo?: boolean
          fichado_qr_activo?: boolean
          fichado_token_activo?: boolean
          geo_exigir_en_qr?: boolean
          id?: string
          logo_url?: string | null
          nombre_grupo?: string
          notificaciones_email_activas?: boolean | null
          organizacion_id?: string
          qr_duracion_segundos?: number
          registro_abierto?: boolean
          registro_codigo?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          cuit?: string | null
          demo_acceso_dias?: number
          demo_bloqueo_minutos?: number
          demo_codigo_minutos?: number
          demo_max_fallos_ip_hora?: number
          demo_max_intentos_codigo?: number
          demo_max_solicitudes_ip_hora?: number
          divisor_hora?: number
          domicilio?: string | null
          email?: string | null
          email_remitente?: string | null
          extra_minimo_minutos?: number
          fichado_facial_activo?: boolean
          fichado_geo_activo?: boolean
          fichado_qr_activo?: boolean
          fichado_token_activo?: boolean
          geo_exigir_en_qr?: boolean
          id?: string
          logo_url?: string | null
          nombre_grupo?: string
          notificaciones_email_activas?: boolean | null
          organizacion_id?: string
          qr_duracion_segundos?: number
          registro_abierto?: boolean
          registro_codigo?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_grupo_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: true
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
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
          organizacion_id: string
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
          organizacion_id?: string
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
          organizacion_id?: string
          plan_obra_social?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "datos_medicos_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "datos_medicos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_bloqueos: {
        Row: {
          clave: string
          created_at: string
          hasta: string
          id: string
          motivo: string | null
        }
        Insert: {
          clave: string
          created_at?: string
          hasta: string
          id?: string
          motivo?: string | null
        }
        Update: {
          clave?: string
          created_at?: string
          hasta?: string
          id?: string
          motivo?: string | null
        }
        Relationships: []
      }
      demo_codigo_maestro: {
        Row: {
          activo: boolean
          codigo_hash: string
          created_at: string
          expira_at: string
          id: string
          usos: number
        }
        Insert: {
          activo?: boolean
          codigo_hash: string
          created_at?: string
          expira_at: string
          id?: string
          usos?: number
        }
        Update: {
          activo?: boolean
          codigo_hash?: string
          created_at?: string
          expira_at?: string
          id?: string
          usos?: number
        }
        Relationships: []
      }
      demo_codigos: {
        Row: {
          codigo_hash: string
          consumido: boolean
          consumido_at: string | null
          created_at: string
          expira_at: string
          id: string
          intentos: number
          lead_id: string
        }
        Insert: {
          codigo_hash: string
          consumido?: boolean
          consumido_at?: string | null
          created_at?: string
          expira_at: string
          id?: string
          intentos?: number
          lead_id: string
        }
        Update: {
          codigo_hash?: string
          consumido?: boolean
          consumido_at?: string | null
          created_at?: string
          expira_at?: string
          id?: string
          intentos?: number
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_codigos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "demo_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_cuentas: {
        Row: {
          created_at: string
          email: string
          empleado_id: string | null
          expira_at: string
          id: string
          lead_id: string
          rol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          empleado_id?: string | null
          expira_at: string
          id?: string
          lead_id: string
          rol: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          empleado_id?: string | null
          expira_at?: string
          id?: string
          lead_id?: string
          rol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_cuentas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "demo_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_intentos: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip: string | null
          resultado: string
          tipo: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          resultado: string
          tipo: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          resultado?: string
          tipo?: string
        }
        Relationships: []
      }
      demo_leads: {
        Row: {
          accesos: number
          created_at: string
          email: string
          empresa: string | null
          id: string
          nombre: string
          telefono: string | null
          ultimo_acceso: string | null
          ultimo_email_at: string | null
          ultimo_email_estado: string | null
          ultimo_email_id: string | null
          ultimo_ip: string | null
          updated_at: string
          verificado: boolean
        }
        Insert: {
          accesos?: number
          created_at?: string
          email: string
          empresa?: string | null
          id?: string
          nombre: string
          telefono?: string | null
          ultimo_acceso?: string | null
          ultimo_email_at?: string | null
          ultimo_email_estado?: string | null
          ultimo_email_id?: string | null
          ultimo_ip?: string | null
          updated_at?: string
          verificado?: boolean
        }
        Update: {
          accesos?: number
          created_at?: string
          email?: string
          empresa?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          ultimo_acceso?: string | null
          ultimo_email_at?: string | null
          ultimo_email_estado?: string | null
          ultimo_email_id?: string | null
          ultimo_ip?: string | null
          updated_at?: string
          verificado?: boolean
        }
        Relationships: []
      }
      documentos_legajo: {
        Row: {
          categoria: string | null
          created_at: string
          empleado_id: string
          fecha_vencimiento: string | null
          id: string
          nombre_archivo: string
          organizacion_id: string
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
          organizacion_id?: string
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
          organizacion_id?: string
          storage_path?: string
          tamano?: string | null
          tipo_documento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_legajo_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "documentos_legajo_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          organizacion_id: string
          puesto: string
          sexo: string | null
          sucursal_id: string
          sueldo_basico: number | null
          telefono: string | null
          updated_at: string
          user_id: string | null
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
          organizacion_id?: string
          puesto: string
          sexo?: string | null
          sucursal_id: string
          sueldo_basico?: number | null
          telefono?: string | null
          updated_at?: string
          user_id?: string | null
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
          organizacion_id?: string
          puesto?: string
          sexo?: string | null
          sucursal_id?: string
          sueldo_basico?: number | null
          telefono?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_empresa_id_fkey"
            columns: ["organizacion_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "empleados_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_sucursal_id_fkey"
            columns: ["organizacion_id", "sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["organizacion_id", "id"]
          },
        ]
      }
      empleados_cambios: {
        Row: {
          cambiado_por: string | null
          campo: string
          created_at: string
          empleado_id: string
          id: string
          organizacion_id: string
          origen: string
          valor_anterior: string | null
          valor_nuevo: string | null
        }
        Insert: {
          cambiado_por?: string | null
          campo: string
          created_at?: string
          empleado_id: string
          id?: string
          organizacion_id?: string
          origen: string
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          cambiado_por?: string | null
          campo?: string
          created_at?: string
          empleado_id?: string
          id?: string
          organizacion_id?: string
          origen?: string
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_cambios_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "empleados_cambios_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          organizacion_id: string
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
          organizacion_id?: string
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
          organizacion_id?: string
          provincia?: string | null
          razon_social?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      encuesta_participaciones: {
        Row: {
          encuesta_id: string
          organizacion_id: string
          respondida_at: string
          user_id: string
        }
        Insert: {
          encuesta_id: string
          organizacion_id?: string
          respondida_at?: string
          user_id: string
        }
        Update: {
          encuesta_id?: string
          organizacion_id?: string
          respondida_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encuesta_participaciones_encuesta_id_fkey"
            columns: ["organizacion_id", "encuesta_id"]
            isOneToOne: false
            referencedRelation: "encuestas"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "encuesta_participaciones_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      encuesta_preguntas: {
        Row: {
          encuesta_id: string
          id: string
          obligatoria: boolean
          opciones: Json
          orden: number
          organizacion_id: string
          texto: string
          tipo: string
        }
        Insert: {
          encuesta_id: string
          id?: string
          obligatoria?: boolean
          opciones?: Json
          orden?: number
          organizacion_id?: string
          texto: string
          tipo: string
        }
        Update: {
          encuesta_id?: string
          id?: string
          obligatoria?: boolean
          opciones?: Json
          orden?: number
          organizacion_id?: string
          texto?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "encuesta_preguntas_encuesta_id_fkey"
            columns: ["organizacion_id", "encuesta_id"]
            isOneToOne: false
            referencedRelation: "encuestas"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "encuesta_preguntas_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      encuesta_respuestas: {
        Row: {
          encuesta_id: string
          envio_id: string
          escala: number | null
          id: string
          opciones: number[] | null
          organizacion_id: string
          pregunta_id: string
          respondente: string | null
          texto: string | null
        }
        Insert: {
          encuesta_id: string
          envio_id: string
          escala?: number | null
          id?: string
          opciones?: number[] | null
          organizacion_id?: string
          pregunta_id: string
          respondente?: string | null
          texto?: string | null
        }
        Update: {
          encuesta_id?: string
          envio_id?: string
          escala?: number | null
          id?: string
          opciones?: number[] | null
          organizacion_id?: string
          pregunta_id?: string
          respondente?: string | null
          texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encuesta_respuestas_encuesta_id_fkey"
            columns: ["organizacion_id", "encuesta_id"]
            isOneToOne: false
            referencedRelation: "encuestas"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "encuesta_respuestas_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encuesta_respuestas_pregunta_id_fkey"
            columns: ["organizacion_id", "pregunta_id"]
            isOneToOne: false
            referencedRelation: "encuesta_preguntas"
            referencedColumns: ["organizacion_id", "id"]
          },
        ]
      }
      encuestas: {
        Row: {
          anonima: boolean
          cierra_at: string | null
          creada_por: string
          created_at: string
          descripcion: string
          estado: string
          id: string
          imagen_url: string | null
          mostrar_resultados: string
          organizacion_id: string
          publicacion_id: string | null
          publicada_at: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          anonima?: boolean
          cierra_at?: string | null
          creada_por?: string
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          imagen_url?: string | null
          mostrar_resultados?: string
          organizacion_id?: string
          publicacion_id?: string | null
          publicada_at?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          anonima?: boolean
          cierra_at?: string | null
          creada_por?: string
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          imagen_url?: string | null
          mostrar_resultados?: string
          organizacion_id?: string
          publicacion_id?: string | null
          publicada_at?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encuestas_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encuestas_publicacion_id_fkey"
            columns: ["organizacion_id", "publicacion_id"]
            isOneToOne: false
            referencedRelation: "muro_publicaciones"
            referencedColumns: ["organizacion_id", "id"]
          },
        ]
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
          organizacion_id: string
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
          organizacion_id?: string
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
          organizacion_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudios_empleado_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "estudios_empleado_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_asistencias: {
        Row: {
          evento_id: string
          organizacion_id: string
          respuesta: string
          updated_at: string
          user_id: string
        }
        Insert: {
          evento_id: string
          organizacion_id?: string
          respuesta: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          evento_id?: string
          organizacion_id?: string
          respuesta?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_asistencias_evento_id_fkey"
            columns: ["organizacion_id", "evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "evento_asistencias_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          creado_por: string
          created_at: string
          descripcion: string
          enlace: string | null
          fin: string | null
          id: string
          inicio: string
          lugar: string | null
          organizacion_id: string
          pide_asistencia: boolean
          publicacion_id: string | null
          tipo: string
          titulo: string
          todo_el_dia: boolean
          updated_at: string
        }
        Insert: {
          creado_por?: string
          created_at?: string
          descripcion?: string
          enlace?: string | null
          fin?: string | null
          id?: string
          inicio: string
          lugar?: string | null
          organizacion_id?: string
          pide_asistencia?: boolean
          publicacion_id?: string | null
          tipo?: string
          titulo: string
          todo_el_dia?: boolean
          updated_at?: string
        }
        Update: {
          creado_por?: string
          created_at?: string
          descripcion?: string
          enlace?: string | null
          fin?: string | null
          id?: string
          inicio?: string
          lugar?: string | null
          organizacion_id?: string
          pide_asistencia?: boolean
          publicacion_id?: string | null
          tipo?: string
          titulo?: string
          todo_el_dia?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_publicacion_id_fkey"
            columns: ["organizacion_id", "publicacion_id"]
            isOneToOne: false
            referencedRelation: "muro_publicaciones"
            referencedColumns: ["organizacion_id", "id"]
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
          organizacion_id: string
          tipo: Database["public"]["Enums"]["tipo_evento_legajo"]
          titulo: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          empleado_id: string
          fecha: string
          id?: string
          organizacion_id?: string
          tipo: Database["public"]["Enums"]["tipo_evento_legajo"]
          titulo: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          empleado_id?: string
          fecha?: string
          id?: string
          organizacion_id?: string
          tipo?: Database["public"]["Enums"]["tipo_evento_legajo"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_legajo_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "eventos_legajo_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      feriados: {
        Row: {
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          nombre: string
          organizacion_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fecha: string
          id?: string
          nombre: string
          organizacion_id?: string
          tipo?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          nombre?: string
          organizacion_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "feriados_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      fichadas: {
        Row: {
          cargada_por: string | null
          created_at: string
          distancia_m: number | null
          empleado_id: string
          estado: string
          fecha: string
          hora_entrada: string | null
          hora_salida: string | null
          id: string
          latitud: number | null
          longitud: number | null
          metodo: string | null
          metodo_salida: string | null
          observaciones: string | null
          organizacion_id: string
          precision_m: number | null
          terminal_user_id: string | null
          turno_id: string | null
        }
        Insert: {
          cargada_por?: string | null
          created_at?: string
          distancia_m?: number | null
          empleado_id: string
          estado?: string
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          metodo?: string | null
          metodo_salida?: string | null
          observaciones?: string | null
          organizacion_id?: string
          precision_m?: number | null
          terminal_user_id?: string | null
          turno_id?: string | null
        }
        Update: {
          cargada_por?: string | null
          created_at?: string
          distancia_m?: number | null
          empleado_id?: string
          estado?: string
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          metodo?: string | null
          metodo_salida?: string | null
          observaciones?: string | null
          organizacion_id?: string
          precision_m?: number | null
          terminal_user_id?: string | null
          turno_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichadas_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "fichadas_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichadas_turno_id_fkey"
            columns: ["organizacion_id", "turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["organizacion_id", "id"]
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
          organizacion_id: string
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
          organizacion_id?: string
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
          organizacion_id?: string
          parentesco?: Database["public"]["Enums"]["parentesco_familiar"]
        }
        Relationships: [
          {
            foreignKeyName: "grupo_familiar_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "grupo_familiar_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_miembros: {
        Row: {
          created_at: string
          grupo_id: string
          organizacion_id: string
          rol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grupo_id: string
          organizacion_id?: string
          rol?: string
          user_id: string
        }
        Update: {
          created_at?: string
          grupo_id?: string
          organizacion_id?: string
          rol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_miembros_grupo_id_fkey"
            columns: ["organizacion_id", "grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "grupo_miembros_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          color: string
          creado_por: string
          created_at: string
          descripcion: string
          id: string
          nombre: string
          organizacion_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          color?: string
          creado_por?: string
          created_at?: string
          descripcion?: string
          id?: string
          nombre: string
          organizacion_id?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          color?: string
          creado_por?: string
          created_at?: string
          descripcion?: string
          id?: string
          nombre?: string
          organizacion_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          organizacion_id: string
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
          organizacion_id?: string
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
          organizacion_id?: string
          tipo?: Database["public"]["Enums"]["tipo_concepto"]
        }
        Relationships: [
          {
            foreignKeyName: "liquidacion_lineas_concepto_id_fkey"
            columns: ["organizacion_id", "concepto_id"]
            isOneToOne: false
            referencedRelation: "conceptos_liquidacion"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "liquidacion_lineas_liquidacion_id_fkey"
            columns: ["organizacion_id", "liquidacion_id"]
            isOneToOne: false
            referencedRelation: "liquidaciones"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "liquidacion_lineas_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          organizacion_id: string
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
          organizacion_id?: string
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
          organizacion_id?: string
          periodo?: string
          sueldo_basico?: number
          total_deducciones?: number
          total_no_remunerativo?: number
          total_remunerativo?: number
        }
        Relationships: [
          {
            foreignKeyName: "liquidaciones_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "liquidaciones_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          emisor_cargo: string | null
          emisor_nombre: string | null
          emisor_sector: string | null
          emitido_por: string | null
          empresa_id: string | null
          estado: Database["public"]["Enums"]["estado_memorandum"]
          fecha: string
          fecha_firma: string | null
          firmado_por: string | null
          id: string
          numero: number
          organizacion_id: string
          titulo: string
        }
        Insert: {
          contenido?: string
          created_at?: string
          created_by?: string | null
          destinatario_empleado_id?: string | null
          destinatario_nombre?: string | null
          emisor_cargo?: string | null
          emisor_nombre?: string | null
          emisor_sector?: string | null
          emitido_por?: string | null
          empresa_id?: string | null
          estado?: Database["public"]["Enums"]["estado_memorandum"]
          fecha?: string
          fecha_firma?: string | null
          firmado_por?: string | null
          id?: string
          numero?: number
          organizacion_id?: string
          titulo: string
        }
        Update: {
          contenido?: string
          created_at?: string
          created_by?: string | null
          destinatario_empleado_id?: string | null
          destinatario_nombre?: string | null
          emisor_cargo?: string | null
          emisor_nombre?: string | null
          emisor_sector?: string | null
          emitido_por?: string | null
          empresa_id?: string | null
          estado?: Database["public"]["Enums"]["estado_memorandum"]
          fecha?: string
          fecha_firma?: string | null
          firmado_por?: string | null
          id?: string
          numero?: number
          organizacion_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorandums_destinatario_empleado_id_fkey"
            columns: ["organizacion_id", "destinatario_empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "memorandums_empresa_id_fkey"
            columns: ["organizacion_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "memorandums_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      muro_comentarios: {
        Row: {
          autor_id: string
          contenido: string
          created_at: string
          id: string
          organizacion_id: string
          publicacion_id: string
        }
        Insert: {
          autor_id?: string
          contenido: string
          created_at?: string
          id?: string
          organizacion_id?: string
          publicacion_id: string
        }
        Update: {
          autor_id?: string
          contenido?: string
          created_at?: string
          id?: string
          organizacion_id?: string
          publicacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "muro_comentarios_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "muro_comentarios_publicacion_id_fkey"
            columns: ["organizacion_id", "publicacion_id"]
            isOneToOne: false
            referencedRelation: "muro_publicaciones"
            referencedColumns: ["organizacion_id", "id"]
          },
        ]
      }
      muro_lecturas: {
        Row: {
          confirmado_at: string | null
          organizacion_id: string
          publicacion_id: string
          user_id: string
          visto_at: string
        }
        Insert: {
          confirmado_at?: string | null
          organizacion_id?: string
          publicacion_id: string
          user_id?: string
          visto_at?: string
        }
        Update: {
          confirmado_at?: string | null
          organizacion_id?: string
          publicacion_id?: string
          user_id?: string
          visto_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "muro_lecturas_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "muro_lecturas_publicacion_id_fkey"
            columns: ["organizacion_id", "publicacion_id"]
            isOneToOne: false
            referencedRelation: "muro_publicaciones"
            referencedColumns: ["organizacion_id", "id"]
          },
        ]
      }
      muro_publicaciones: {
        Row: {
          autor_id: string
          contenido: string
          created_at: string
          editada: boolean
          fijada: boolean
          grupo_id: string | null
          id: string
          imagen_url: string | null
          mencion_user_id: string | null
          oculta: boolean
          organizacion_id: string
          requiere_confirmacion: boolean
          tipo: string
          updated_at: string
        }
        Insert: {
          autor_id?: string
          contenido?: string
          created_at?: string
          editada?: boolean
          fijada?: boolean
          grupo_id?: string | null
          id?: string
          imagen_url?: string | null
          mencion_user_id?: string | null
          oculta?: boolean
          organizacion_id?: string
          requiere_confirmacion?: boolean
          tipo?: string
          updated_at?: string
        }
        Update: {
          autor_id?: string
          contenido?: string
          created_at?: string
          editada?: boolean
          fijada?: boolean
          grupo_id?: string | null
          id?: string
          imagen_url?: string | null
          mencion_user_id?: string | null
          oculta?: boolean
          organizacion_id?: string
          requiere_confirmacion?: boolean
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "muro_publicaciones_grupo_id_fkey"
            columns: ["organizacion_id", "grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "muro_publicaciones_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      muro_reacciones: {
        Row: {
          created_at: string
          organizacion_id: string
          publicacion_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organizacion_id?: string
          publicacion_id: string
          tipo: string
          user_id?: string
        }
        Update: {
          created_at?: string
          organizacion_id?: string
          publicacion_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "muro_reacciones_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "muro_reacciones_publicacion_id_fkey"
            columns: ["organizacion_id", "publicacion_id"]
            isOneToOne: false
            referencedRelation: "muro_publicaciones"
            referencedColumns: ["organizacion_id", "id"]
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
          organizacion_id: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leida?: boolean
          link?: string | null
          mensaje?: string
          organizacion_id?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leida?: boolean
          link?: string | null
          mensaje?: string
          organizacion_id?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          organizacion_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          empleado_id: string
          fecha: string
          id?: string
          organizacion_id?: string
          tipo: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          empleado_id?: string
          fecha?: string
          id?: string
          organizacion_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "novedades_asistencia_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "novedades_asistencia_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      organizaciones: {
        Row: {
          created_at: string
          estado: string
          id: string
          nombre: string
          plan: string
          slug: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          nombre: string
          plan?: string
          slug: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          nombre?: string
          plan?: string
          slug?: string
        }
        Relationships: []
      }
      push_config: {
        Row: {
          clave_anon: string | null
          created_at: string
          id: number
          secreto: string
          url_funcion: string
          vapid_privada: Json
          vapid_publica: string
        }
        Insert: {
          clave_anon?: string | null
          created_at?: string
          id?: number
          secreto: string
          url_funcion: string
          vapid_privada: Json
          vapid_publica: string
        }
        Update: {
          clave_anon?: string | null
          created_at?: string
          id?: number
          secreto?: string
          url_funcion?: string
          vapid_privada?: Json
          vapid_publica?: string
        }
        Relationships: []
      }
      push_suscripciones: {
        Row: {
          actualizada_at: string
          auth: string
          created_at: string
          dispositivo: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          actualizada_at?: string
          auth: string
          created_at?: string
          dispositivo?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          actualizada_at?: string
          auth?: string
          created_at?: string
          dispositivo?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      qr_sesiones: {
        Row: {
          codigo: string
          consumido: boolean
          consumido_at: string | null
          consumido_por: string | null
          created_at: string
          emitido_at: string
          expira_at: string
          id: string
          organizacion_id: string
          terminal_user_id: string | null
        }
        Insert: {
          codigo: string
          consumido?: boolean
          consumido_at?: string | null
          consumido_por?: string | null
          created_at?: string
          emitido_at?: string
          expira_at: string
          id?: string
          organizacion_id?: string
          terminal_user_id?: string | null
        }
        Update: {
          codigo?: string
          consumido?: boolean
          consumido_at?: string | null
          consumido_por?: string | null
          created_at?: string
          emitido_at?: string
          expira_at?: string
          id?: string
          organizacion_id?: string
          terminal_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_sesiones_consumido_por_fkey"
            columns: ["organizacion_id", "consumido_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "qr_sesiones_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      restricciones_horario: {
        Row: {
          activo: boolean
          created_at: string | null
          hora_desde: string
          hora_hasta: string
          id: string
          organizacion_id: string
          role: string
        }
        Insert: {
          activo?: boolean
          created_at?: string | null
          hora_desde?: string
          hora_hasta?: string
          id?: string
          organizacion_id?: string
          role: string
        }
        Update: {
          activo?: boolean
          created_at?: string | null
          hora_desde?: string
          hora_hasta?: string
          id?: string
          organizacion_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "restricciones_horario_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      rostros_empleados: {
        Row: {
          consentimiento_at: string
          consentimiento_texto: string
          created_at: string
          descriptores: Json
          empleado_id: string
          foto_path: string | null
          organizacion_id: string
          registrado_por: string | null
          updated_at: string
          verificado_at: string | null
          verificado_por: string | null
        }
        Insert: {
          consentimiento_at: string
          consentimiento_texto: string
          created_at?: string
          descriptores: Json
          empleado_id: string
          foto_path?: string | null
          organizacion_id?: string
          registrado_por?: string | null
          updated_at?: string
          verificado_at?: string | null
          verificado_por?: string | null
        }
        Update: {
          consentimiento_at?: string
          consentimiento_texto?: string
          created_at?: string
          descriptores?: Json
          empleado_id?: string
          foto_path?: string | null
          organizacion_id?: string
          registrado_por?: string | null
          updated_at?: string
          verificado_at?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rostros_empleados_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "rostros_empleados_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          organizacion_id: string
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
          organizacion_id?: string
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
          organizacion_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanciones_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "sanciones_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_alta: {
        Row: {
          apellido: string
          consentimiento_at: string
          created_at: string
          cuil: string
          dni: string
          email: string
          empleado_id: string | null
          empresa_id: string | null
          estado: string
          fecha_nacimiento: string | null
          id: string
          motivo_rechazo: string | null
          nombre: string
          organizacion_id: string
          revisado_at: string | null
          revisado_por: string | null
          sucursal_id: string | null
          telefono: string
          user_id: string | null
        }
        Insert: {
          apellido: string
          consentimiento_at?: string
          created_at?: string
          cuil: string
          dni: string
          email: string
          empleado_id?: string | null
          empresa_id?: string | null
          estado?: string
          fecha_nacimiento?: string | null
          id?: string
          motivo_rechazo?: string | null
          nombre: string
          organizacion_id?: string
          revisado_at?: string | null
          revisado_por?: string | null
          sucursal_id?: string | null
          telefono: string
          user_id?: string | null
        }
        Update: {
          apellido?: string
          consentimiento_at?: string
          created_at?: string
          cuil?: string
          dni?: string
          email?: string
          empleado_id?: string | null
          empresa_id?: string | null
          estado?: string
          fecha_nacimiento?: string | null
          id?: string
          motivo_rechazo?: string | null
          nombre?: string
          organizacion_id?: string
          revisado_at?: string | null
          revisado_por?: string | null
          sucursal_id?: string | null
          telefono?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_alta_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "solicitudes_alta_empresa_id_fkey"
            columns: ["organizacion_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "solicitudes_alta_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_alta_sucursal_id_fkey"
            columns: ["organizacion_id", "sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["organizacion_id", "id"]
          },
        ]
      }
      solicitudes_permiso: {
        Row: {
          adjuntos: Json
          aprobado_at: string | null
          aprobado_cargo: string | null
          aprobado_nombre: string | null
          aprobado_por: string | null
          created_at: string
          empleado_id: string
          estado: Database["public"]["Enums"]["estado_solicitud"]
          fecha_desde: string
          fecha_hasta: string
          fecha_solicitud: string
          hora_reintegro: string | null
          hora_salida: string | null
          id: string
          motivo: string
          motivo_detalle: string | null
          observaciones: string | null
          organizacion_id: string
          sujeto_descuento: boolean
        }
        Insert: {
          adjuntos?: Json
          aprobado_at?: string | null
          aprobado_cargo?: string | null
          aprobado_nombre?: string | null
          aprobado_por?: string | null
          created_at?: string
          empleado_id: string
          estado?: Database["public"]["Enums"]["estado_solicitud"]
          fecha_desde: string
          fecha_hasta: string
          fecha_solicitud?: string
          hora_reintegro?: string | null
          hora_salida?: string | null
          id?: string
          motivo: string
          motivo_detalle?: string | null
          observaciones?: string | null
          organizacion_id?: string
          sujeto_descuento?: boolean
        }
        Update: {
          adjuntos?: Json
          aprobado_at?: string | null
          aprobado_cargo?: string | null
          aprobado_nombre?: string | null
          aprobado_por?: string | null
          created_at?: string
          empleado_id?: string
          estado?: Database["public"]["Enums"]["estado_solicitud"]
          fecha_desde?: string
          fecha_hasta?: string
          fecha_solicitud?: string
          hora_reintegro?: string | null
          hora_salida?: string | null
          id?: string
          motivo?: string
          motivo_detalle?: string | null
          observaciones?: string | null
          organizacion_id?: string
          sujeto_descuento?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_permiso_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "solicitudes_permiso_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          organizacion_id: string
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
          organizacion_id?: string
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
          organizacion_id?: string
          periodo_anual?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_vacaciones_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "solicitudes_vacaciones_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      soporte_mensajes: {
        Row: {
          autor_id: string
          contenido: string
          created_at: string
          id: string
          leido: boolean
          organizacion_id: string
          pantalla: string | null
          usuario_email: string | null
          usuario_id: string
          usuario_nombre: string | null
        }
        Insert: {
          autor_id: string
          contenido: string
          created_at?: string
          id?: string
          leido?: boolean
          organizacion_id?: string
          pantalla?: string | null
          usuario_email?: string | null
          usuario_id: string
          usuario_nombre?: string | null
        }
        Update: {
          autor_id?: string
          contenido?: string
          created_at?: string
          id?: string
          leido?: boolean
          organizacion_id?: string
          pantalla?: string | null
          usuario_email?: string | null
          usuario_id?: string
          usuario_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soporte_mensajes_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          latitud: number | null
          longitud: number | null
          nombre: string
          organizacion_id: string
          radio_metros: number
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          empresa_id: string
          id?: string
          latitud?: number | null
          longitud?: number | null
          nombre: string
          organizacion_id?: string
          radio_metros?: number
        }
        Update: {
          created_at?: string
          direccion?: string | null
          empresa_id?: string
          id?: string
          latitud?: number | null
          longitud?: number | null
          nombre?: string
          organizacion_id?: string
          radio_metros?: number
        }
        Relationships: [
          {
            foreignKeyName: "sucursales_empresa_id_fkey"
            columns: ["organizacion_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "sucursales_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas: {
        Row: {
          asignada_a: string
          completada_at: string | null
          creada_por: string
          created_at: string
          descripcion: string
          estado: string
          id: string
          organizacion_id: string
          prioridad: string
          titulo: string
          updated_at: string
          vence: string | null
        }
        Insert: {
          asignada_a?: string
          completada_at?: string | null
          creada_por?: string
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          organizacion_id?: string
          prioridad?: string
          titulo: string
          updated_at?: string
          vence?: string | null
        }
        Update: {
          asignada_a?: string
          completada_at?: string | null
          creada_por?: string
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          organizacion_id?: string
          prioridad?: string
          titulo?: string
          updated_at?: string
          vence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens_asistencia: {
        Row: {
          created_at: string | null
          empleado_id: string
          id: string
          organizacion_id: string
          secret: string
        }
        Insert: {
          created_at?: string | null
          empleado_id: string
          id?: string
          organizacion_id?: string
          secret: string
        }
        Update: {
          created_at?: string | null
          empleado_id?: string
          id?: string
          organizacion_id?: string
          secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_asistencia_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "tokens_asistencia_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens_consumidos: {
        Row: {
          empleado_id: string
          id: string
          organizacion_id: string
          token: string
          usado_at: string | null
        }
        Insert: {
          empleado_id: string
          id?: string
          organizacion_id?: string
          token: string
          usado_at?: string | null
        }
        Update: {
          empleado_id?: string
          id?: string
          organizacion_id?: string
          token?: string
          usado_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_consumidos_empleado_id_fkey"
            columns: ["organizacion_id", "empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "tokens_consumidos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          organizacion_id: string
          tolerancia_minutos: number
        }
        Insert: {
          created_at?: string
          hora_entrada: string
          hora_salida: string
          id?: string
          nombre: string
          organizacion_id?: string
          tolerancia_minutos?: number
        }
        Update: {
          created_at?: string
          hora_entrada?: string
          hora_salida?: string
          id?: string
          nombre?: string
          organizacion_id?: string
          tolerancia_minutos?: number
        }
        Relationships: [
          {
            foreignKeyName: "turnos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          organizacion_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          organizacion_id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          organizacion_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_organizacion_activa: {
        Row: {
          organizacion_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          organizacion_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          organizacion_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_organizacion_activa_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      vacaciones_config: {
        Row: {
          anios_antiguedad_max: number
          anios_antiguedad_min: number
          created_at: string
          dias_correspondientes: number
          empresa_id: string
          id: string
          organizacion_id: string
        }
        Insert: {
          anios_antiguedad_max?: number
          anios_antiguedad_min?: number
          created_at?: string
          dias_correspondientes?: number
          empresa_id: string
          id?: string
          organizacion_id?: string
        }
        Update: {
          anios_antiguedad_max?: number
          anios_antiguedad_min?: number
          created_at?: string
          dias_correspondientes?: number
          empresa_id?: string
          id?: string
          organizacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacaciones_config_empresa_id_fkey"
            columns: ["organizacion_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "vacaciones_config_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          organizacion_id: string
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
          organizacion_id?: string
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
          organizacion_id?: string
          requisitos?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacantes_empresa_id_fkey"
            columns: ["organizacion_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["organizacion_id", "id"]
          },
          {
            foreignKeyName: "vacantes_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      actualizar_mis_datos: { Args: { _datos: Json }; Returns: undefined }
      cambiar_organizacion: {
        Args: { _organizacion_id: string }
        Returns: undefined
      }
      chat_crear_grupo: {
        Args: { _miembros: string[]; _nombre: string }
        Returns: string
      }
      chat_directorio: {
        Args: never
        Returns: {
          apellido: string
          avatar_url: string
          empresa: string
          nombre: string
          puesto: string
          user_id: string
        }[]
      }
      chat_es_participante: {
        Args: { _conversacion_id: string }
        Returns: boolean
      }
      chat_es_participante_carpeta: {
        Args: { _carpeta: string }
        Returns: boolean
      }
      chat_iniciar_directa: { Args: { _otro: string }; Returns: string }
      chat_mis_conversaciones: {
        Args: never
        Returns: {
          id: string
          no_leidos: number
          nombre: string
          participantes: string[]
          tipo: string
          ultimo_adjunto_tipo: string
          ultimo_autor_id: string
          ultimo_eliminado: boolean
          ultimo_mensaje_at: string
          ultimo_texto: string
        }[]
      }
      configurar_registro: {
        Args: { _abierto: boolean; _regenerar: boolean }
        Returns: string
      }
      encuesta_publicar: { Args: { _encuesta_id: string }; Returns: string }
      encuesta_responder: {
        Args: { _encuesta_id: string; _respuestas: Json }
        Returns: undefined
      }
      encuesta_resultados: { Args: { _encuesta_id: string }; Returns: Json }
      es_admin_grupo: { Args: { _grupo_id: string }; Returns: boolean }
      es_miembro_grupo: { Args: { _grupo_id: string }; Returns: boolean }
      es_soporte: { Args: never; Returns: boolean }
      evento_crear: {
        Args: {
          _anunciar: boolean
          _descripcion: string
          _enlace: string
          _fin: string
          _inicio: string
          _lugar: string
          _pide_asistencia: boolean
          _tipo: string
          _titulo: string
          _todo_el_dia: boolean
        }
        Returns: string
      }
      get_server_time: { Args: never; Returns: string }
      get_users_with_roles: {
        Args: never
        Returns: {
          email: string
          id: string
          role: string
          user_id: string
        }[]
      }
      grupo_agregar_masivo: {
        Args: { _empresa_id: string; _grupo_id: string; _sucursal_id: string }
        Returns: number
      }
      grupos_listado: {
        Args: never
        Returns: {
          color: string
          descripcion: string
          id: string
          miembros: number
          nombre: string
          soy_admin: boolean
          soy_miembro: boolean
          tipo: string
          ultima_actividad: string
        }[]
      }
      guardar_liquidacion: {
        Args: {
          _empleado_id: string
          _lineas: Json
          _neto: number
          _periodo: string
          _sueldo_basico: number
          _total_deducciones: number
          _total_no_remunerativo: number
          _total_remunerativo: number
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: never; Returns: boolean }
      is_manager_or_contador: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      mis_organizaciones: {
        Args: never
        Returns: {
          actual: boolean
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["app_role"]
          slug: string
        }[]
      }
      multiempresa_revision: {
        Args: never
        Returns: {
          objeto: string
          problema: string
        }[]
      }
      muro_celebraciones: {
        Args: { _dias?: number }
        Returns: {
          anios: number
          apellido: string
          avatar_url: string
          dia: number
          dias_faltan: number
          empleado_id: string
          mes: number
          nombre: string
          puesto: string
          tipo: string
          user_id: string
        }[]
      }
      muro_confirmar_lectura: {
        Args: { _publicacion_id: string }
        Returns: string
      }
      muro_es_moderador: { Args: never; Returns: boolean }
      muro_lecturas_detalle: {
        Args: { _publicacion_id: string }
        Returns: {
          apellido: string
          avatar_url: string
          confirmado_at: string
          nombre: string
          puesto: string
          user_id: string
          visto_at: string
        }[]
      }
      muro_lecturas_resumen: {
        Args: { _ids: string[] }
        Returns: {
          confirmados: number
          publicacion_id: string
          vistos: number
          yo_confirmado_at: string
        }[]
      }
      muro_perfiles: {
        Args: { _user_ids: string[] }
        Returns: {
          apellido: string
          avatar_url: string
          empresa: string
          nombre: string
          puesto: string
          user_id: string
        }[]
      }
      muro_registrar_vistas: { Args: { _ids: string[] }; Returns: undefined }
      my_empleado_id: { Args: never; Returns: string }
      nuevo_codigo_registro: { Args: never; Returns: string }
      org_actual: { Args: never; Returns: string }
      org_transicion_demo: { Args: never; Returns: string }
      org_vigente: { Args: never; Returns: string }
      solicitudes_destinatarios_gestion: {
        Args: { _excluir: string[] }
        Returns: string[]
      }
      soporte_email: { Args: never; Returns: string }
      soporte_user_id: { Args: never; Returns: string }
      terminal_ultimas_fichadas: {
        Args: never
        Returns: {
          apellido: string
          hora: string
          legajo: string
          nombre: string
          tipo: string
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
