

# Plan: Código de asistencia, importación de planilla biométrica y registro por token

## Análisis de la planilla del lector biométrico

La planilla XLS tiene esta estructura:
- **User ID**: código numérico único del empleado en el lector (ej: 1, 3, 9, 12, 20)
- **Name, Dept., Date**: datos descriptivos
- **Period1 In/Out, Period2 In/Out**: marcajes de entrada/salida
- **Late, Leave, Total, State**: cálculos del lector

El campo clave para vincular es **User ID** → necesitamos un campo `codigo_asistencia` en la tabla `empleados`.

## Análisis de viabilidad del sistema de tokens

**Enfoque propuesto: TOTP (Time-based One-Time Password)**

Cada empleado tiene un secreto único en la base de datos. Desde Autogestión en su celular, genera un código de 6 dígitos que cambia cada 60 segundos. En la PC de la sucursal (con usuario rol `registro_asistencia`), se ingresa el código y el sistema valida automáticamente a qué empleado corresponde, registrando la fichada.

**Seguridad anti-fraude:**
- Token válido solo 60 segundos (ventana corta)
- Cada token se marca como consumido (no se puede reusar)
- El secreto está en el servidor, no en el celular (se genera dinámicamente)
- El empleado necesita su sesión activa en Autogestión para generar el token
- Riesgo residual: el empleado podría dictar el código por teléfono a alguien en la sucursal → se mitiga con la ventana corta de 60 segundos

**Conclusión**: Es viable y razonablemente seguro. No es tan robusto como huella digital, pero agrega una capa de presencia razonable.

---

## Cambios a implementar

### 1. Agregar campo `codigo_asistencia` a tabla `empleados`

Migración SQL:
```sql
ALTER TABLE empleados ADD COLUMN codigo_asistencia text UNIQUE;
```

### 2. Agregar tabla `tokens_asistencia` para secretos TOTP

```sql
CREATE TABLE tokens_asistencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  secret text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(empleado_id)
);
-- RLS: empleados leen su propio token, admins leen todos
```

### 3. Tabla `tokens_consumidos` para evitar reutilización

```sql
CREATE TABLE tokens_consumidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL,
  token text NOT NULL,
  usado_at timestamptz DEFAULT now(),
  UNIQUE(empleado_id, token)
);
```

### 4. Agregar rol `registro_asistencia` al enum `app_role`

```sql
ALTER TYPE app_role ADD VALUE 'registro_asistencia';
```

### 5. Edge Function `validate-attendance-token`

Recibe un código de 6 dígitos, busca a qué empleado corresponde validando contra todos los secretos activos (con ventana de ±1 período), verifica que no fue consumido, registra la fichada y marca el token como consumido.

### 6. Cambios en UI

| Archivo | Cambio |
|---------|--------|
| `src/pages/LegajoDetail.tsx` | Campo "Código de Asistencia" editable en datos del empleado |
| `src/pages/Asistencia.tsx` | Importar XLS del lector biométrico matcheando por `codigo_asistencia` |
| `src/pages/Autogestion.tsx` | Nueva pestaña "Token de Asistencia": genera y muestra código TOTP con countdown |
| `src/pages/RegistroAsistencia.tsx` | Nueva página exclusiva para rol `registro_asistencia`: solo un input de token + botón fichar |
| `src/components/AppSidebar.tsx` | Mostrar solo "Registro" para el rol `registro_asistencia` |
| `src/components/EmployeeGuard.tsx` | Redirigir rol `registro_asistencia` a `/registro-asistencia` |
| `src/App.tsx` | Agregar ruta `/registro-asistencia` |
| `supabase/functions/validate-attendance-token/index.ts` | Edge Function para validar token TOTP y registrar fichada |

### 7. Importación de planilla del lector biométrico

En la pestaña "Planillas" de Asistencia, agregar botón "Importar Lector Biométrico" que:
- Lee el XLS subido
- Parsea User ID, Date, Period1 In/Out
- Matchea User ID con `empleados.codigo_asistencia`
- Crea fichadas en bulk con los datos importados
- Muestra resumen: X fichadas importadas, X no matcheadas

### 8. Generación de token en Autogestión

- El empleado ve un código de 6 dígitos grande en pantalla
- Barra de progreso circular que muestra los segundos restantes
- Se regenera automáticamente cada 60 segundos
- El secreto se genera la primera vez que el empleado accede (se guarda en `tokens_asistencia`)

### 9. Página de Registro de Asistencia

UI minimalista para la PC de la sucursal:
- Logo de TotalRH
- Input grande para el código de 6 dígitos
- Botón "Fichar"
- Feedback visual: nombre del empleado fichado, hora, tipo (entrada/salida)
- Sin sidebar, sin navegación compleja

