import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const PORT = 4173;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, `http://${HOST}:${PORT}`).pathname);
    const requested = pathname === '/' ? '/whitechapel/' : pathname;
    let filePath = path.resolve(ROOT, `.${requested}`);
    if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
      send(res, 403, 'Forbidden');
      return;
    }
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
    const fileInfo = await stat(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
      'Content-Length': fileInfo.size,
      'Cache-Control': 'no-store',
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(filePath).pipe(res);
  } catch (error) {
    send(res, error?.code === 'ENOENT' ? 404 : 500, error?.code === 'ENOENT' ? 'Not Found' : 'Server Error');
  }
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`E2E server listening on http://${HOST}:${PORT}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
