import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "../node_modules/@excalidraw/excalidraw/dist/excalidraw-assets",
          dest: ".",
        },
      ],
    }),
  ],
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 3000,
  },
});
