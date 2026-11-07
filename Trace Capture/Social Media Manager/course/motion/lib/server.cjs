/**
 * Serves local course assets with byte ranges for Safari/native media seeking.
 * Dependencies: common.cjs paths/filesystem and Node HTTP/streams.
 * Consumed by: browser preview and deterministic capture sessions.
 * Why: generic static servers can make audio seek ranges unavailable on this Mac.
 */
'use strict';
/* eslint @typescript-eslint/no-require-imports: "off" -- Offline tooling uses CommonJS consistently. */
const http = require('node:http');
const { once } = require('node:events');
const c = require('./common.cjs');
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.vtt': 'text/vtt',
  '.md': 'text/plain; charset=utf-8',
};
function byteRange(value, size) {
  if (!value) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) throw new Error('Unsupported byte range');
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  )
    throw new Error('Requested byte range is outside this file');
  return { start, end, partial: true };
}
function serveFile(request, response, target) {
  const size = c.fs.statSync(target).size;
  let range;
  try {
    range = byteRange(request.headers.range, size);
  } catch {
    response.writeHead(416, { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' });
    response.end();
    return;
  }
  const headers = {
    'Content-Type': MIME[c.path.extname(target)] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Content-Length': Math.max(0, range.end - range.start + 1),
    'Cache-Control': 'no-cache',
  };
  if (range.partial) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`;
  response.writeHead(range.partial ? 206 : 200, headers);
  if (request.method === 'HEAD' || size === 0) {
    response.end();
    return;
  }
  const stream = c.fs.createReadStream(target, { start: range.start, end: range.end });
  stream.on('error', (error) => {
    process.stderr.write(
      `Course asset stream failed: ${error.message}. Check the named asset is readable.\n`,
    );
    response.destroy(error);
  });
  stream.pipe(response);
}
/** Creates a course-root server bound later by the caller; never serves parent directories. */
function courseServer() {
  return http.createServer((request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        response.end('Use GET or HEAD.');
        return;
      }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const target = c.path.resolve(c.COURSE, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (
        !target.startsWith(c.COURSE + c.path.sep) ||
        !c.fs.existsSync(target) ||
        !c.fs.statSync(target).isFile()
      ) {
        response.writeHead(404);
        response.end('Course asset not found.');
        return;
      }
      serveFile(request, response, target);
    } catch (error) {
      response.writeHead(400);
      response.end(`Course request failed: ${error.message}`);
    }
  });
}
/** Starts loopback-only serving. Returns the server and origin for explicit lifecycle management. */
async function startServer(port = 0) {
  const server = courseServer();
  server.listen(port, '127.0.0.1');
  await once(server, 'listening');
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
module.exports = { courseServer, startServer, byteRange };
