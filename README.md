# McMa Finance · Formulario de leads para eventos

Formulario web (mobile-first, línea gráfica McMa) para que el equipo del stand registre leads, o muestre un QR para que el cliente se registre solo. Cada lead queda atribuido a quien lo captó, sin mostrar su nombre en pantalla.

**Sitio:** https://mickirep.github.io/mcma-registro/

## Cómo funciona

```
Celular (formulario)  ──POST──>  Apps Script (/exec)  ──appendRow──>  Google Sheet
   └ cola local si no hay internet; reintenta cada 15 s
```

| Archivo | Qué es |
|---|---|
| `index.html` | Formulario, validación, botón de QR, cola offline. Configuración arriba del `<script>`: `ENDPOINT`, `CODIGOS`, `SERVICIOS`, `VOLUMENES`. |
| `apps-script.gs` | Receptor. Se pega en la hoja → Extensiones → Apps Script. Busca el nombre del capturador por código en la pestaña **Capturadores**, evita duplicados por `ID de envío`. |
| `sw.js`, `manifest.webmanifest` | Permiten abrir el formulario sin conexión e instalarlo en la pantalla de inicio. |
| `qrcode.min.js` | Librería de QR (qrcode-generator 1.4.4), local para funcionar offline. |

## Enlaces del equipo

Cada persona usa `https://mickirep.github.io/mcma-registro/?r=CÓDIGO`. La relación código → nombre vive **solo** en la pestaña *Capturadores* de la hoja (no en este repositorio, que es público).

- Modo capturador: `?r=CÓDIGO` → formulario + botón **Mostrar QR**.
- Modo cliente (lo abre el QR): `?r=CÓDIGO&c=qr` → formulario + pantalla de gracias; el lead queda con canal "QR".
- Código inválido o ausente → "Enlace no válido".

Para agregar una persona: añadir el código en `CODIGOS` (index.html) y la fila código/nombre en la pestaña *Capturadores*.

## Hoja de Google

Pestañas: **Leads** (un registro por fila), **Capturadores** (código → nombre), **Resumen** (totales por persona y canal, con fórmulas).

## Implementar el receptor (Apps Script)

1. En la hoja: Extensiones → Apps Script, pegar `apps-script.gs`.
2. Implementar → Nueva implementación → **Aplicación web** · Ejecutar como: **Yo** · Quién tiene acceso: **Cualquier usuario**.
3. Copiar la URL `/exec` y ponerla en `ENDPOINT` dentro de `index.html`; hacer push a `main` (GitHub Pages publica solo).
4. Probar: abrir la URL `/exec` en ventana de incógnito; debe responder `{"ok":true,"servicio":"leads-mcma"}`.

### Pendiente (noviembre 2026)

La implementación actual responde **403 "Necesitas acceso"** a usuarios anónimos aunque esté configurada con "Cualquier usuario". Causa probable: política del Workspace mcmabolivia.com que bloquea compartir web apps fuera del dominio. Opciones:

- Que el admin de Workspace lo permita (Admin console → Apps → Google Workspace → Drive y Docs → Configuración de uso compartido).
- Implementar el script desde una cuenta Gmail personal con acceso de editor a la hoja, y reemplazar `ENDPOINT`.

Hasta que se resuelva, los leads quedan guardados en cada celular y se envían solos cuando el endpoint responda.
