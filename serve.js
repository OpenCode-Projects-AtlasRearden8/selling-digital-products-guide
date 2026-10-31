"use strict";

// Local preview server for the built site. Binds to 127.0.0.1 only.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4173);
const ROOT = path.join(__dirname, "site");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let filePath = path.normalize(path.join(ROOT, urlPath === "/" ? "index.html" : urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found. Did you run `npm run build`?");
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Preview at http://127.0.0.1:" + PORT + " (Ctrl+C to stop)");
});
