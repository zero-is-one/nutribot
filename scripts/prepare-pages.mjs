import {
  copyFileSync,
  existsSync,
  openSync,
  closeSync,
  mkdirSync,
  unlinkSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const clientDir = resolve(root, "dist", "client");
const indexPath = resolve(clientDir, "index.html");
const dotHtmlPath = resolve(clientDir, ".html");
const notFoundPath = resolve(clientDir, "404.html");
const noJekyllPath = resolve(clientDir, ".nojekyll");

const sourcePath = existsSync(indexPath)
  ? indexPath
  : existsSync(dotHtmlPath)
    ? dotHtmlPath
    : null;

if (!sourcePath) {
  throw new Error(
    "Could not find root HTML file. Expected dist/client/index.html or dist/client/.html after build.",
  );
}

mkdirSync(dirname(indexPath), { recursive: true });
copyFileSync(sourcePath, indexPath);
copyFileSync(indexPath, notFoundPath);

// GitHub Pages may serve `/.html` (as application/octet-stream) before
// `/index.html`, which causes browsers to download a file instead of rendering.
if (existsSync(dotHtmlPath)) {
  unlinkSync(dotHtmlPath);
}

const fd = openSync(noJekyllPath, "w");
closeSync(fd);

console.log(`Prepared GitHub Pages files using ${sourcePath}`);
