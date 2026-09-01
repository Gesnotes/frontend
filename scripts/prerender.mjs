// Prérendu SEO des pages publiques.
//
// L'application est en rendu 100% client (`createRoot(...).render(...)`,
// voir src/main.tsx) : `dist/index.html` ne contient qu'un `<div id="root">`
// vide, le contenu réel n'existe qu'après exécution du JS par le navigateur.
// Beaucoup de robots (aperçus réseaux sociaux, la plupart des robots IA/GEO,
// et Googlebot en différé) ne voient donc rien à indexer.
//
// Ce script lance un vrai Chromium après le build, capture le HTML une fois
// la page réellement rendue, et écrase les fichiers correspondants dans
// `dist/` — React reprend la main normalement une fois le JS chargé côté
// navigateur, ce script ne change rien à l'expérience utilisateur.
//
// Limité aux trois pages listées dans `public/sitemap.xml` (les seules avec
// une valeur SEO réelle) : la landing page, la connexion et l'inscription.

import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = 4321;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

async function isFile(candidate) {
  try {
    return (await stat(candidate)).isFile();
  } catch {
    return false;
  }
}

/**
 * Sert `dist/` en imitant le `try_files $uri $uri/ /index.html` de
 * `nginx.conf` : le prérendu doit voir exactement le routage de production,
 * sinon il capture une page qui ne correspond pas à ce qui sera vraiment
 * servi une fois déployé.
 */
function startStaticServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`);
      const requested = path.join(DIST, decodeURIComponent(pathname));

      let filePath = requested;
      if (!(await isFile(filePath))) {
        const indexInDir = path.join(requested, 'index.html');
        filePath = (await isFile(indexInDir)) ? indexInDir : path.join(DIST, 'index.html');
      }

      try {
        const content = await readFile(filePath);
        const type = MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end('Introuvable');
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

const ROUTES = [
  { path: '/', out: 'index.html' },
  { path: '/connexion', out: 'connexion/index.html' },
  { path: '/inscription', out: 'inscription/index.html' },
];

async function main() {
  const server = await startStaticServer();
  // `--no-sandbox` : requis pour lancer Chromium dans un conteneur/sandbox
  // (CI, build Docker) où le sandbox natif de Chrome n'a pas les privilèges
  // nécessaires et bloquerait sinon indéfiniment au lancement.
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  try {
    const page = await browser.newPage();
    for (const route of ROUTES) {
      await page.goto(`http://localhost:${PORT}${route.path}`, { waitUntil: 'load' });
      // Attend un contenu réel plutôt qu'un délai fixe : `AuthLayout`/
      // `LandingPage` rendent toujours un `<h1>` non vide dès le premier
      // rendu (aucun appel réseau bloquant, voir HomeRedirect), fragile
      // seulement si ce composant partagé disparaissait un jour.
      await page.waitForFunction(
        () => (document.querySelector('h1')?.textContent?.trim().length ?? 0) > 0,
        undefined,
        { timeout: 15_000 },
      );

      const html = await page.content();
      const outPath = path.join(DIST, route.out);
      await mkdir(path.dirname(outPath), { recursive: true });
      await writeFile(outPath, html);
      console.log(`Prérendu : ${route.path} -> dist/${route.out}`);
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error('Échec du prérendu SEO :', error);
  process.exitCode = 1;
});
