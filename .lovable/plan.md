

# Plan: Reemplazar logo generado por el logo oficial de TotalRH

El logo actual (`public/logo_total_rh.png`) fue generado automáticamente. Hay que reemplazarlo con el logo oficial subido por el usuario.

## Cambios

1. **Copiar el logo oficial** del usuario (`user-uploads://logo_Total_RH-2.png`) a `public/logo_total_rh.png`, sobrescribiendo el generado.

No se necesitan cambios de código — el footer en `AppLayout.tsx`, el sidebar, el PWA manifest y el login ya referencian `/logo_total_rh.png`.

