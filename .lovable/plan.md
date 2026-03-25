

# Plan: Corregir datos de empresa en documentos y permitir memorándums de grupo

## Problemas detectados

1. **Empresa no se autocompleta al elegir empleado**: Al seleccionar un destinatario empleado, la empresa no se setea automáticamente según la empresa del empleado.
2. **No hay opción explícita "Grupo Empresario"**: No se puede elegir generar un memorándum a nivel de grupo (sin empresa específica) con el logo general de TotalRH.
3. **SolicitudPermisoPDF no usa membrete**: La solicitud de permiso se genera sin membrete de la empresa del empleado.

## Cambios

### 1. Auto-selección de empresa al elegir empleado (`Memorandums.tsx`)
- Al seleccionar un empleado destinatario, setear automáticamente `empresa_id` con la empresa del empleado.
- Agregar opción "Grupo Empresario (General)" como primer item del selector de empresa, con valor vacío/especial que indica usar datos del grupo.

### 2. Selector de empresa con opción Grupo (`Memorandums.tsx`)
- Agregar al `<Select>` de empresa una opción inicial: "Total Group (Grupo Empresario)" que deje `empresa_id` vacío.
- Cuando `empresa_id` está vacío, el PDF usará los datos de `configuracion_grupo` con el logo general de TotalRH (`/logo_total_rh.png` como fallback si `config.logo_url` es null).

### 3. Fallback de logo de grupo en PDF (`MemorandumPDF.ts`)
- Cuando se usa el grupo y `logo_url` es null, usar `/logo_total_rh.png` como logo por defecto del grupo.

### 4. SolicitudPermisoPDF con membrete (`SolicitudPermisoPDF.tsx`)
- Refactorizar para aceptar datos de empresa y/o grupo.
- Aplicar `aplicarMembrete` y `aplicarFooterMembrete` igual que en MemorandumPDF.
- Actualizar las llamadas desde donde se genera esta solicitud.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/pages/Memorandums.tsx` | Auto-fill empresa al elegir empleado, opción "Grupo Empresario" |
| `src/components/MemorandumPDF.ts` | Fallback logo TotalRH para grupo |
| `src/components/SolicitudPermisoPDF.tsx` | Agregar membrete de empresa |

