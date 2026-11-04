// Permite abrir el formulario aunque no haya internet en el evento.
const CACHE = 'mcma-leads-v1';
const ARCHIVOS = ['./', './index.html', './qrcode.min.js', './mcma-logo-blanco.png', './mcma-logo-color.png', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // los envíos de leads nunca pasan por la caché
  const url = new URL(req.url);
  const propio = url.origin === location.origin;
  const fuente = url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com');
  if (!propio && !fuente) return;

  // Red primero (para recibir actualizaciones), caché si no hay conexión.
  e.respondWith(
    fetch(req).then((res) => {
      const copia = res.clone();
      caches.open(CACHE).then((c) => c.put(propio && req.mode === 'navigate' ? './index.html' : req, copia));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
