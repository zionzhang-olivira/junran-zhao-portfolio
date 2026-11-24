import http from "node:http";
import { readFileSync, statSync, createReadStream, existsSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const port = Number(process.env.PORT || 4370);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".ico": "image/x-icon", ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
};
if (!existsSync(resolve(dist, "index.html")))
  throw new Error("Run npm run build before starting preview.");
function serve(req, res) {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" });
    return res.end();
  }
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  const candidate = resolve(dist, "." + path);
  if (
    !(candidate === dist || candidate.startsWith(dist + sep)) ||
    path.includes("\0") ||
    path.includes("\\")
  ) {
    res.writeHead(400);
    return res.end();
  }
  let file = candidate,
    status = 200;
  try {
    if (statSync(file).isDirectory()) {
      if (!path.endsWith("/")) {
        res.writeHead(308, {
          Location: path + "/" + new URL(req.url, "http://127.0.0.1").search,
        });
        return res.end();
      }
      file = resolve(file, "index.html");
    }
    if (!statSync(file).isFile()) throw Error();
  } catch {
    file = resolve(dist, "404.html");
    status = 404;
  }
  const type = types[extname(file)] || "application/octet-stream",
    size = statSync(file).size;
  const headers = {
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-cache",
    "X-Robots-Tag": "noindex, nofollow",
  };
  let start = 0,
    end = size - 1;
  if (type === "video/mp4" || type === "application/pdf") {
    headers["Accept-Ranges"] = "bytes";
    if (req.headers.range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!m || (!m[1] && !m[2])) {
        res.writeHead(416, { "Content-Range": "bytes */" + size });
        return res.end();
      }
      if (m[1]) {
        start = Number(m[1]);
        end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      } else {
        start = Math.max(0, size - Number(m[2]));
      }
      if (start > end || start >= size) {
        res.writeHead(416, { "Content-Range": "bytes */" + size });
        return res.end();
      }
      status = 206;
      headers["Content-Range"] = "bytes " + start + "-" + end + "/" + size;
    }
  }
  if (
    (type.startsWith("text/") || type === "image/svg+xml") &&
    /\bgzip\b/.test(req.headers["accept-encoding"] || "")
  ) {
    const body = gzipSync(readFileSync(file));
    res.writeHead(status, {
      ...headers,
      "Content-Encoding": "gzip",
      "Content-Length": body.length,
      Vary: "Accept-Encoding",
    });
    return res.end(req.method === "HEAD" ? undefined : body);
  }
  res.writeHead(status, { ...headers, "Content-Length": end - start + 1 });
  if (req.method === "HEAD") return res.end();
  const stream = createReadStream(file, { start, end });
  stream.on("error", () => res.destroy());
  res.on("close", () => stream.destroy());
  stream.pipe(res);
}
const server = http.createServer((req, res) => {
  try {
    serve(req, res);
  } catch (error) {
    if (res.headersSent) return res.destroy();
    const rebuilding = error.code === "ENOENT" || error.code === "ENOTDIR";
    res.writeHead(rebuilding ? 503 : 500, { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "1", "Cache-Control": "no-store" });
    res.end(rebuilding ? "The portfolio is being rebuilt. Please reload." : "The preview could not read this resource.");
  }
});
server.listen(port, "127.0.0.1", () => {
  const url = "http://127.0.0.1:" + server.address().port + "/";
  console.log("Junran Zhao portfolio · " + url);
  process.send?.({url});
});



