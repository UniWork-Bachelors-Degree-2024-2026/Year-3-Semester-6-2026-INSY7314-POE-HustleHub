import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import { developmentHeaders, productionHeaders } from "./securityHeaders.ts";

// Same local certificate for the dev server and the production preview if available.
const https =
  fs.existsSync("../cert.key") && fs.existsSync("../cert.crt")
    ? {
        key: fs.readFileSync("../cert.key"),
        cert: fs.readFileSync("../cert.crt"),
      }
    : undefined;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https,
    port: 5173,
    // server.headers adds response headers to the dev server (Vite, 2026a).
    headers: developmentHeaders,
  },
  // preview serves the built app on the same port, so the API's CORS origin still matches (Vite, 2026b).
  preview: {
    https,
    port: 5173,
    strictPort: true,
    headers: productionHeaders,
  },
});

// Reference List:
// Vite, 2026a. Server Options. [online] Available at: <https://vite.dev/config/server-options> [Accessed 8 October 2026].
// Vite, 2026b. Preview Options. [online] Available at: <https://vite.dev/config/preview-options> [Accessed 8 October 2026].
