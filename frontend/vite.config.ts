import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // host: true deixa outro aparelho da mesma rede abrir pelo IP deste PC
    host: true,
    port: 5173,
    proxy: { "/api": "http://localhost:3001" },
  },
});
