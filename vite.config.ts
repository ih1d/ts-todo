import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: ".",
  build: {
    outDir: "dist/client",
  },
  server: {
    proxy: {
      "/todos": "http://localhost:3000",
      "/login": "http://localhost:3000",
      "/signup": "http://localhost:3000",
    },
  },
});
