import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test-only config, kept separate so vite.config.ts (HTTPS dev server) is unchanged.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
