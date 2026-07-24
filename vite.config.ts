import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Cible du proxy de développement.
 *
 * Le navigateur appelle `/api/...` sur sa propre origine, Vite relaie vers le
 * backend. On évite ainsi le préflight CORS, et surtout l'application reste
 * joignable depuis un téléphone ou un tunnel HTTPS — impossible avec un
 * `http://localhost:3000` codé dans le bundle, seul moyen d'essayer la PWA et
 * les notifications sur un vrai appareil.
 */
const API_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig({
  server: {
    // Écoute sur toutes les interfaces : nécessaire pour ouvrir l'application
    // depuis un téléphone du même réseau.
    host: true,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),

    /**
     * PWA — espaces enseignant et parent.
     *
     * `injectManifest` plutôt que `generateSW` : le service worker doit aussi
     * traiter les messages FCM reçus en arrière-plan. Deux workers concurrents
     * sur la même portée se remplaceraient l'un l'autre, donc il n'y en a
     * qu'un, écrit à la main dans `src/sw.ts`.
     */
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: null,
      registerType: 'prompt',
      devOptions: { enabled: true, type: 'module' },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Le bundle Firebase Messaging pèse lourd ; la limite par défaut de
        // 2 Mio rejetterait la compilation du worker.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Gesnotes — Suivi scolaire',
        short_name: 'Gesnotes',
        description:
          'Consultez les notes de vos enfants et saisissez celles de vos classes, même hors connexion.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f8f9ff',
        theme_color: '#1e40af',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: '/icons/gesnotes.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/gesnotes-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'Saisir des notes', url: '/enseignant/saisie' },
          { name: 'Notes de mon enfant', url: '/parent/notes' },
        ],
      },
    }),
  ],
});
