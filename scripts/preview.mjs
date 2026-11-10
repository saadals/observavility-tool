#!/usr/bin/env node
/** Zero-dependency static server for the exported site in /out (run `npm run build` first). */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = join(new URL('..', import.meta.url).pathname, 'out');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain' };

if (!existsSync(root)) {
  console.error('No /out folder found. Run `npm run build` first.');
  process.exit(1);
}

createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = normalize(join(root, url));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    if (existsSync(`${file}.html`)) file = `${file}.html`;
    else {
      res.writeHead(404, { 'content-type': types['.html'] }).end(readFileSync(join(root, '404.html')));
      return;
    }
  }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
}).listen(port, () => console.warn(`Static preview: http://localhost:${port}`));
