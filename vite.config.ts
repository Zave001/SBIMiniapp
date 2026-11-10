import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Приложение отдаёт aiohttp бота: index.html на «/», файлы — в /assets.
// В dev-режиме запросы к API проксируются на локальный бот (WEBAPP_PORT=8081).
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    target: "es2020",
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8081",
    },
  },
});
