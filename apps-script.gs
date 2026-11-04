/**
 * McMa Finance — Receptor de leads del evento
 * Pegar en: Google Sheet "Leads Evento McMa Finance" → Extensiones → Apps Script
 * Implementar → Nueva implementación → Aplicación web
 *   Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 */

const HOJA_LEADS = 'Leads';
const HOJA_CAPTURADORES = 'Capturadores';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents || '{}');

    // Honeypot anti-bots: si viene lleno, se ignora en silencio.
    if (d.website) return json_({ ok: true });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const leads = ss.getSheetByName(HOJA_LEADS);

    // Evita duplicados cuando el celular reintenta un envío.
    const id = String(d.id || '').slice(0, 64);
    if (id && leads.getLastRow() > 1) {
      const ids = leads.getRange(2, 13, leads.getLastRow() - 1, 1).getValues().flat();
      if (ids.indexOf(id) !== -1) return json_({ ok: true, duplicado: true });
    }

    const codigo = String(d.codigo || '').toUpperCase().slice(0, 12);
    const capturador = nombrePorCodigo_(ss, codigo);

    const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 200);
    const fecha = d.ts ? new Date(d.ts) : new Date();

    leads.appendRow([
      fecha,
      codigo || 'Sin código',
      capturador,
      d.canal === 'qr' ? 'QR' : 'Manual',
      t(d.nombres),
      t(d.apellidos),
      t(d.empresa),
      (Array.isArray(d.servicios) ? d.servicios : []).map(s => t(s, 80)).join(', '),
      t(d.volumen),
      "'" + t(d.telefono, 40),
      t(d.correo, 120).toLowerCase(),
      d.consentimiento ? 'Sí' : 'No',
      id
    ]);

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
