import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "autoUpdate" fetches new versions in the background and activates them on
      // next load — no "update available" popup to manage for a daily-use business tool.
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon-32.png", "icons/favicon-16.png", "icons/apple-touch-icon.png"],
      manifest: false, // manifest.webmanifest is served directly from /public instead of generated here

      workbox: {
        // Precache the built app shell (JS/CSS/HTML) so the app still opens with
        // no connection — this is what makes "installed and offline" work for the UI.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],

        // IMPORTANT: Supabase requests (auth, database, storage, edge functions) are
        // deliberately NOT cached. Business data (sales, stock, balances) must always
        // come from the network — caching it could show stale or wrong numbers once
        // back online. Only the app's own static files are cached.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },

      devOptions: {
        enabled: false, // keep the service worker off during `npm run dev`
      },
    }),
  ],
});

