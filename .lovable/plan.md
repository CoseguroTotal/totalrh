

# Plan: Eliminar branding Lovable y optimizar compartir enlace con logo TotalRH

## Resumen

El código del proyecto ya no tiene ninguna referencia visible a "Lovable". El badge "Edit in Lovable" que aparece en la app publicada se desactiva desde la configuración del proyecto (Settings → Hide Lovable Badge). Para que al compartir el enlace en WhatsApp, iMessage, redes sociales etc. aparezca el logo de TotalRH, hay que agregar las meta tags `og:image` y `twitter:image`.

---

## Cambios

### 1. Ocultar badge de Lovable
- Se usará la configuración de publicación del proyecto para ocultar el badge (no requiere código).

### 2. Meta tags OG para compartir con logo
En `index.html`, agregar:
- `og:image` apuntando a la URL absoluta del logo (`https://rrhh-totalgroup.lovable.app/logo_total_rh.png`)
- `og:image:width`, `og:image:height` para dimensiones
- `twitter:card`, `twitter:image` para previews en Twitter/X
- `og:url` con la URL publicada

### 3. Apple touch icon (ya existe)
Ya está configurado correctamente con `/logo_total_rh.png`.

---

## Archivo editado

| Archivo | Cambio |
|---------|--------|
| `index.html` | Agregar `og:image`, `twitter:card`, `twitter:image`, `og:url` |

