import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/react-minesweeper/" : "/",
  plugins: [react()],
  test: {
    clearMocks: true,
    css: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
}));
