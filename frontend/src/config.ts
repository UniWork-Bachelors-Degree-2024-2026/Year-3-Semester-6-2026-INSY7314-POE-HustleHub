// Settings that change between local development and Docker, read from Vite environment variables at build time.
// With nothing set, the app talks to the API on https://localhost:3000.
export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) || "https://localhost:3000/api";
