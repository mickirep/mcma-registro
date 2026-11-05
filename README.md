# McMa Finance · Formulario de leads para eventos

Formulario web mobile-first para que el equipo del stand registre leads, o muestre un QR para que el cliente se registre solo. Cada lead queda atribuido al evento y a quien lo captó.

**Sitio:** https://eventos.mcmafinance.com/fintechday2026/?r=CÓDIGO
**Hoja:** "Leads Evento McMa Finance" (dueño: Marketing)

## Cómo funciona

```
eventos.mcmafinance.com/<evento>/?r=CÓDIGO
   │  S3 + CloudFront (AWS 412373518521, us-east-1, stack McmaEventos)
   │  └ cola local en el celular si no hay internet; reintenta cada 15 s
   ▼
Apps Script (web app, instalada en la hoja)  ──>  pestaña Leads
```

| Archivo | Qué es |
|---|---|
| `index.html` | Formulario, validación, QR, cola offline. Configuración arriba del `<script>`: `ENDPOINT`, `CAPTURADORES`, `EVENTOS`, `SERVICIOS`, `VOLUMENES`. |
| `apps-script.gs` | Receptor. Busca columnas por encabezado, agrega las que falten, evita duplicados por `ID de envío`, rechaza envíos incompletos. |
| `sw.js`, `manifest.webmanifest` | Abrir sin conexión e instalar en la pantalla de inicio. |
| `qrcode.min.js` | qrcode-generator 1.4.4, local para funcionar offline. |
| `infra/` | CDK: bucket S3 privado, CloudFront (rutas por evento, raíz → www.mcmafinance.com), certificado ACM, registros A/AAAA `eventos` en Route 53. |

## Modos

- **Selector** `/<evento>/` sin código: el capturador elige su nombre; queda guardado en el celular. El botón con su nombre (arriba a la derecha) permite cambiarlo.
- **Capturador** `/<evento>/?r=CÓDIGO`: formulario + barra con "enviados", "por enviar" y botón **Mostrar QR**. Funciona sin internet.
- **Cliente** `/<evento>/?r=CÓDIGO&c=qr` (lo abre el QR): la pantalla de gracias aparece solo cuando el servidor confirma; si falla, botón "Reintentar envío". Necesita internet en el celular del cliente.
- Evento inválido, o QR sin código válido → "Enlace no válido".

El selector muestra los nombres de `CAPTURADORES` (index.html, público). En la hoja se guarda el código; la pestaña **Capturadores** lo traduce a nombre.

## Operación

**Nuevo evento:** agregar `'slug': 'Nombre visible'` en `EVENTOS` (index.html) y desplegar. El enlace queda en `/slug/`.

**Nueva persona:** agregar `'CÓDIGO': 'Nombre'` en `CAPTURADORES` y la fila código/nombre en *Capturadores*.

**Probar en local:** `node infra/local.js` → http://localhost:8080/fintechday2026/. En localhost los envíos se simulan (se ven en la consola, no llegan a la hoja); con DevTools en *Offline* se prueba la cola.

**Desplegar el sitio** (≈2 min, invalida la caché de CloudFront):
```bash
cd infra && npm ci
eval "$(aws configure export-credentials --profile <perfil> --format env)"   # CDK 2.170 no lee sesiones de `aws login`
AWS_REGION=us-east-1 npx cdk deploy --require-approval never
```

**Actualizar el Apps Script:** pegar `apps-script.gs` → Guardar → Implementar → **Gestionar implementaciones → ✏️ → Nueva versión**. No usar "Nueva implementación": cambia la URL y el formulario deja de enviar.

**Probar el endpoint:** `GET` a la URL `/exec` debe responder `{"ok":true,"servicio":"leads-mcma"}`; un `POST` con `{}` debe responder `incompleto`.

## Pendientes (próximo sprint)

Seguridad y orden:
1. Mover el repo a la organización `MCMABO-LLC` como **privado** (hoy es público en una cuenta personal y expone códigos, endpoint e IDs de AWS).
2. Apagar GitHub Pages del repo viejo (`mickirep.github.io/mcma-registro`) o reemplazarlo por una redirección al subdominio.
3. Desplegar con un usuario o rol IAM de permisos mínimos (asumir roles `cdk-*`) en vez de la sesión root; idealmente GitHub Actions con OIDC.
4. Endurecer el formulario: códigos de capturador fuera del código público, límite de envíos por IP o token por evento, validación de formato en el servidor, cerrar eventos pasados.
5. Enlazar la política de privacidad en el texto de consentimiento.

Producto:
6. Integración con Kommo (contacto + lead con etiqueta del evento y responsable = capturador), con reintento si Kommo falla.
7. GA4/GTM (`GTM-KJ9PF2KK`): `qr_shown`, `form_start`, `generate_lead`, sin datos personales.
8. Pasada de diseño y alertas si el Apps Script falla.
