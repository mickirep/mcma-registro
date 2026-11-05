/**
 * McMa Finance — Receptor de leads de eventos
 * Pegar en: Google Sheet "Leads Evento McMa Finance" → Extensiones → Apps Script
 * Implementar → Nueva implementación → Aplicación web
 *   Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 *
 * Las columnas se buscan por su encabezado (fila 1), así que se pueden reordenar.
 * Si falta alguna (p. ej. "Evento"), se agrega sola al final.
 */

const HOJA_LEADS = 'Leads';
const HOJA_CAPTURADORES = 'Capturadores';
const COLUMNAS = [
  'Fecha y hora', 'Evento', 'Código', 'Capturador', 'Canal', 'Nombres', 'Apellidos',
  'Empresa u organización', 'Servicios de interés', 'Volumen mensual estimado',
  'Número de contacto', 'Correo electrónico', 'Consentimiento', 'ID de envío'
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents || '{}');

    // Honeypot anti-bots: si viene lleno, se ignora en silencio.
    if (d.website) return json_({ ok: true });

    // El endpoint es público: solo se aceptan envíos completos del formulario.
    if (!d.id || !d.nombres || !d.correo || !d.evento) return json_({ ok: false, error: 'incompleto' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const leads = ss.getSheetByName(HOJA_LEADS);
    const col = columnas_(leads);

    // Evita duplicados cuando el celular reintenta un envío.
    const id = String(d.id || '').slice(0, 64);
    if (id && leads.getLastRow() > 1) {
      const ids = leads.getRange(2, col['ID de envío'], leads.getLastRow() - 1, 1).getValues().flat();
      if (ids.indexOf(id) !== -1) return json_({ ok: true, duplicado: true });
    }

    const codigo = String(d.codigo || '').toUpperCase().slice(0, 12);
    const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 200);

    const valores = {
      'Fecha y hora': d.ts ? new Date(d.ts) : new Date(),
      'Evento': t(d.evento, 80) || 'Sin evento',
      'Código': codigo || 'Sin código',
      'Capturador': nombrePorCodigo_(ss, codigo),
      'Canal': d.canal === 'qr' ? 'QR' : 'Manual',
      'Nombres': t(d.nombres),
      'Apellidos': t(d.apellidos),
      'Empresa u organización': t(d.empresa),
      'Servicios de interés': (Array.isArray(d.servicios) ? d.servicios : []).map(s => t(s, 80)).join(', '),
      'Volumen mensual estimado': t(d.volumen),
      'Número de contacto': "'" + t(d.telefono, 40),
      'Correo electrónico': t(d.correo, 120).toLowerCase(),
      'Consentimiento': d.consentimiento ? 'Sí' : 'No',
      'ID de envío': id
    };

    const fila = new Array(leads.getLastColumn()).fill('');
    Object.keys(valores).forEach(k => { fila[col[k] - 1] = valores[k]; });
    leads.appendRow(fila);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, servicio: 'leads-mcma' });
}

// Devuelve { encabezado: número de columna }, agregando al final las que falten.
function columnas_(hoja) {
  const ancho = Math.max(hoja.getLastColumn(), 1);
  const encabezados = hoja.getRange(1, 1, 1, ancho).getValues()[0].map(h => String(h).trim());
  const col = {};
  encabezados.forEach((h, i) => { if (h) col[h] = i + 1; });
  let siguiente = encabezados.filter(String).length ? hoja.getLastColumn() + 1 : 1;
  COLUMNAS.forEach(h => {
    if (!col[h]) { hoja.getRange(1, siguiente).setValue(h); col[h] = siguiente++; }
  });
  return col;
}

function nombrePorCodigo_(ss, codigo) {
  const hoja = ss.getSheetByName(HOJA_CAPTURADORES);
  const filas = hoja.getRange(2, 1, Math.max(hoja.getLastRow() - 1, 1), 2).getValues();
  for (const [c, nombre] of filas) {
    if (String(c).toUpperCase() === codigo) return nombre;
  }
  return 'Desconocido';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
