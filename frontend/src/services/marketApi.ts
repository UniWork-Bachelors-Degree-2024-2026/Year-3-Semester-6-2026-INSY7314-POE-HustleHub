import { ApiError } from "./api.ts";
import { API_URL } from "../config.ts";
import { clearSession, getToken } from "./session.ts";
import type {
  AuditEventsPage,
  AuditEventType,
  Booking,
  Gig,
  GigPayload,
  TaxEstimate,
  Transaction,
} from "../models/market.ts";
import type { ProfileExtras, PublicProfile } from "../models/profile.ts";

// Same base URL as services/api.ts, read from src/config.ts.

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Generic, user-safe messages. Raw server errors and stack traces are never shown.
const FALLBACK: Record<number, string> = {
  400: "Some of the details were not accepted. Please check them and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You do not have permission to do that.",
  404: "We could not find what you were looking for.",
  429: "Too many requests. Please wait a moment and try again.",
};

async function request<T>(path: string, method: Method = "GET", body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.");
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.ok) return data as T;

  // An expired or tampered token: clear it and send the user back to log in
  if (res.status === 401 && token) {
    clearSession();
    window.location.replace("/login");
  }

  const d = (data ?? {}) as { message?: unknown; errors?: unknown };
  const serverMsg = typeof d.message === "string" ? d.message : "";
  const errors = Array.isArray(d.errors) ? d.errors.filter((x): x is string => typeof x === "string") : [];
  if (res.status >= 500) {
    throw new ApiError("Something went wrong on our side. Please try again shortly.", [], res.status);
  }
  throw new ApiError(serverMsg || FALLBACK[res.status] || "Request failed.", errors, res.status);
}

export const toApiError = (e: unknown): ApiError =>
  e instanceof ApiError ? e : new ApiError("Something unexpected went wrong.");

interface Wrapped<T> {
  data: T;
}

// Gigs
export const getGigs = async () => (await request<Wrapped<Gig[]>>("/gigs", "GET", undefined, false)).data;
export const getGig = async (id: string) => (await request<Wrapped<Gig>>(`/gigs/${id}`, "GET", undefined, false)).data;
export const getMyGigs = async () => (await request<Wrapped<Gig[]>>("/gigs/my-gigs")).data;
export const createGig = async (p: GigPayload) => (await request<Wrapped<Gig>>("/gigs", "POST", p)).data;
export const updateGig = async (id: string, p: Partial<GigPayload>) =>
  (await request<Wrapped<Gig>>(`/gigs/${id}`, "PUT", p)).data;
export const deleteGig = (id: string) => request<{ message: string }>(`/gigs/${id}`, "DELETE");

// Bookings and transactions
export const getBookings = async () => (await request<Wrapped<Booking[]>>("/bookings")).data;
export const getTransactions = async () => (await request<Wrapped<Transaction[]>>("/transactions")).data;

// The tax estimate and insights are worked out by the server so the dashboard and the API always agree
export const getTaxEstimate = async () => (await request<Wrapped<TaxEstimate>>("/transactions/tax-estimate")).data;

export interface NewBooking {
  gigId: string;
  requirements: string;
  scheduledDate?: string;
  paymentMethod: "simulated_card" | "simulated_eft";
}
export const createBooking = async (b: NewBooking) =>
  (await request<Wrapped<{ booking: Booking; transaction: Transaction }>>("/bookings", "POST", b)).data;

export const updateBookingStatus = (id: string, status: string) =>
  request<{ message: string }>(`/bookings/${id}/status`, "PATCH", { status });

export const cancelBooking = (id: string) => request<{ message: string }>(`/bookings/${id}`, "DELETE");

// Public profiles. A freelancer's live gigs use the existing ?freelancer= filter on GET /gigs.
export const getGigsBy = async (userId: string) =>
  (await request<Wrapped<Gig[]>>(`/gigs?freelancer=${encodeURIComponent(userId)}`, "GET", undefined, false)).data;

// Expects GET /api/users/:id/profile on the backend (see the notes that came with this change)
export const getPublicProfile = async (userId: string) =>
  (await request<Wrapped<PublicProfile>>(`/users/${encodeURIComponent(userId)}/profile`)).data;

// Expects PUT /api/users/me/profile. Only what the person chose to make public is sent.
export const savePublicProfile = (p: ProfileExtras) => {
  const { notifyBookings: _b, notifyNews: _n, ...shared } = p;
  void _b;
  void _n;
  return request<{ message: string }>("/users/me/profile", "PUT", p.visible ? shared : { visible: false });
};

// Admin: one page of the stored security events, optionally for one event type
export const getAuditEvents = async (page: number, type?: AuditEventType) => {
  // URLSearchParams builds the query string (MDN Web Docs, 2026).
  const query = new URLSearchParams({ page: String(page), limit: "10" });
  if (type) query.set("type", type);
  return request<AuditEventsPage>(`/admin/audit-events?${query.toString()}`);
};

// Reference List:
// MDN Web Docs, 2026. URLSearchParams. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams> [Accessed 7 November 2026].
