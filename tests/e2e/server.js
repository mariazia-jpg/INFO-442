// Minimal static file server for the end-to-end tests (no dependencies).
// Serves the built app and falls back to index.html for app routes, like a
// single-page-app host does (GitHub Pages does the same via 404.html).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

export async function startServer(dir = process.env.E2E_DIST || 'dist-e2e') {
  const root = resolve(dir);
  const indexHtml = await readFile(join(root, 'index.html'));

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const filePath = normalize(join(root, decodeURIComponent(url.pathname)));
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const info = await stat(filePath);
      if (info.isFile()) {
        res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream' });
        res.end(await readFile(filePath));
        return;
      }
    } catch {
      // not a file: fall through
    }
    if (extname(url.pathname)) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES['.html'] });
    res.end(indexHtml);
  });

  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((done) => server.close(done)),
  };
}
