

# Plan: Rebranding a TotalRH

## Resumen

Reemplazar toda la identidad "GrupoRH" por "TotalRH", incorporar el logo subido como favicon e imagen de marca, y ajustar la paleta de colores para alinearse con los tonos del logo (celeste/cyan `#4FC3F7` y verde-teal `#26A69A`).

---

## Cambios

### 1. Logo e imágenes
- Copiar `user-uploads://logo_Total_RH.png` a `public/logo_total_rh.png` (favicon y PWA) y a `src/assets/logo_total_rh.png` (componentes React)
- Actualizar `index.html`: favicon apuntando a `/logo_total_rh.png`, title y metas OG → "TotalRH"
- Actualizar `public/manifest.json`: name, short_name, icons
- Actualizar `vite.config.ts`: PWA manifest name/short_name/theme_color

### 2. Textos "GrupoRH" → "TotalRH"
- `src/pages/Login.tsx`: título y reemplazar ícono Building2 por el logo importado
- `src/components/AppSidebar.tsx`: nombre en header del sidebar + reemplazar ícono por logo
- `src/components/MemorandumPDF.ts`: fallback name
- `vite.config.ts`, `index.html`, `manifest.json`: ya mencionados arriba

### 3. Paleta de colores (alineada al logo)
Ajustar variables CSS en `src/index.css`:
- `--primary`: de navy oscuro a un teal más alineado al logo (~`174 60% 38%`)
- `--accent`: mantener pero ajustar al cyan del logo (~`199 90% 63%`)
- `--sidebar-primary`: teal del logo
- `--sidebar-background`: navy oscuro compatible
- `--theme-color` en metas: actualizar a `#26A69A`

### 4. Login con logo
- Reemplazar el ícono `Building2` con cuadrado por una `<img>` del logo importado desde `@/assets/logo_total_rh.png`

---

## Archivos editados

| Archivo | Cambio |
|---------|--------|
| `index.html` | Favicon, title, metas OG |
| `public/manifest.json` | name, short_name, theme_color |
| `vite.config.ts` | PWA manifest fields |
| `src/index.css` | Variables de color primary/accent/sidebar |
| `src/pages/Login.tsx` | Logo + texto "TotalRH" |
| `src/components/AppSidebar.tsx` | Logo + texto "TotalRH" |
| `src/components/MemorandumPDF.ts` | Fallback "TotalRH" |

## Archivos nuevos (copias del logo)
- `public/logo_total_rh.png`
- `src/assets/logo_total_rh.png`

