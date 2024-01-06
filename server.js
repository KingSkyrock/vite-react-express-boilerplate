import path from "path";
import compression from "compression";
import bodyParser from "body-parser";
import fs from "node:fs/promises";
import express from "express";
import { fileURLToPath } from 'url';

const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT || 5173;
const base = process.env.BASE || "/";
const DIST_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'dist');

const app = express();

let vite;
if (!isProduction) {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    base,
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(DIST_DIR, { index: false }));
}

app.use(compression());

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(bodyParser.json());

app.use("*", async (req, res) => {
  try {
    let html;
    if (isProduction) {
      html = await fs.readFile('./dist/index.html', 'utf-8');  
    } else {
      html = await vite.transformIndexHtml(req.originalUrl, await fs.readFile('index.html', 'utf-8'));
    }
    res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    console.log(e.stack);
    res.status(500).end(e.stack);
  }
});


app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
