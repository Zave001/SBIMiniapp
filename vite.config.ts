import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Конфиг выполняется в Node; объявляем только то, что используем (без @types/node).
declare const process: { env: Record<string, string | undefined> };

// Интерфейс размещается на GitHub Pages, данные берёт из API бота (другой домен):
//   VITE_BASE     — путь сайта: /SBIMiniapp/ (продакшн) или /SBIMiniapp/test/ (тест);
//   VITE_API_BASE — адрес сервера бота, например https://is-torus.online.
// В dev-режиме API проксируется на локальный бот (WEBAPP_PORT=8081).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
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
