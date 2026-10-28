import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // three core + fiber only: drei and its helpers split per page, so the
          // shop's hero doesn't download what only the landing (/) uses
          if (id.includes("node_modules/three/") || id.includes("@react-three/fiber")) return "three";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("react-router") || id.includes("react-dom") || id.includes("/react/")) return "react";
          if (id.includes("catalog.generated.json") || id.includes("suppliers.json")) return "catalog-data";
        },
      },
    },
  },
});
