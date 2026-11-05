// Servidor para probar el formulario en local, con las mismas rutas que CloudFront:
// /<evento>/ (sin extensión) sirve index.html. En localhost los envíos se simulan.
//   node infra/local.js        →  http://localhost:8080/fintechday2026/
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PUERTO = Number(process.env.PORT) || 8080;
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

http.createServer((req, res) => {
  let uri = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (uri === '/') { res.writeHead(302, { Location: '/fintechday2026/' }); return res.end(); }
  if (!uri.split('/').pop().includes('.')) uri = '/index.html';
  const archivo = path.join(RAIZ, path.normalize(uri));
  if (!archivo.startsWith(RAIZ + path.sep) || archivo.includes(`${path.sep}infra${path.sep}`)) {
    res.writeHead(404); return res.end();
  }
  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(datos);
  });
}).listen(PUERTO, () => console.log(`Formulario en http://localhost:${PUERTO}/fintechday2026/ (envíos simulados)`));
