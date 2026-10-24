// Minimal no-cache static server for exercising the exact PR checkout in Chromium.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const port = Number(process.env.PORT || 4173);
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.se1', 'application/octet-stream'],
  ['.data', 'application/octet-stream']
]);

const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    res.writeHead(405, { 'Allow': 'GET, HEAD', 'Cache-Control': 'no-store' });
    res.end();
    return;
  }
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403, { 'Cache-Control': 'no-store' });
      res.end('Forbidden');
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) {
      res.writeHead(404, { 'Cache-Control': 'no-store' });
      res.end('Not found');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': mimeTypes.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-store'
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const status = error?.code === 'ENOENT' || error?.code === 'ENOTDIR' ? 404 : 500;
    res.writeHead(status, { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(status === 404 ? 'Not found' : 'Static source server error');
  }
});
server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Serving exact checkout under ${root} on http://127.0.0.1:${port}\n`);
});
