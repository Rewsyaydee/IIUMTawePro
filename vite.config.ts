import { defineConfig } from "vite";
import react from "vite";

export default defineConfig({
  build: {
    cssMinify: "esbuild"
  }
});
