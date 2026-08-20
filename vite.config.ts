import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    cssMinify: "esbuild"
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
