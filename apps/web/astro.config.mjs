/**
 * Builds the static public website for the isolated Justin LeBlanc demo.
 *
 * Dependencies: Astro's configuration helper.
 * Depended on by: Astro dev, check, and build commands.
 * Why this exists: It fixes the canonical demo origin and emits portable static HTML.
 */
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://justinleblancmusic.50by50.dev',
  trailingSlash: 'always',
  vite: {
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:4318',
      },
    },
  },
});
