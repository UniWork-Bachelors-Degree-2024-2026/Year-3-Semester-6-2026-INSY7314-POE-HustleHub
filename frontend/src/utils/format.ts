// Display helpers shared across the app.

export const money = (n: number): string =>
  "R " +
  (Math.round(n * 100) / 100)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    .replace(/\.00$/, "");

export const dshort = (d: string | Date): string =>
  new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });

export const dlong = (d: string | Date): string =>
  new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });

// Date and time in the South African format (MDN Web Docs, 2026).
export const dtime = (d: string | Date): string =>
  new Date(d).toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

export const shortTitle = (t: string): string => t.split(/[:(,]/)[0].trim();

export const monthKey = (d: Date): string => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");

/** Today's date in the user's local time as YYYY-MM-DD (used as the earliest bookable date). */
export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Reference List:
// MDN Web Docs, 2026. Date.prototype.toLocaleString(). [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString> [Accessed 7 November 2026].
