// Shapes returned by the /api/gigs, /api/bookings and /api/transactions endpoints.
// User and role types live in models/user.ts.

export interface PublicUser {
  _id: string;
  username: string;
}

export type GigStatus = "active" | "paused" | "draft";

export interface Gig {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  deliveryTimeDays: number;
  status: GigStatus;
  freelancer: PublicUser | null;
  createdAt: string;
}

export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

export interface Booking {
  _id: string;
  client: PublicUser | null;
  freelancer: PublicUser | null;
  gig: { _id: string; title: string; category: string; price: number; deliveryTimeDays: number } | null;
  price: number;
  status: BookingStatus;
  scheduledDate: string;
  requirements: string;
  createdAt: string;
}

export interface Transaction {
  _id: string;
  bookingId: string | { _id: string } | null;
  amount: number;
  status: "completed" | "pending" | "failed" | "refunded";
  paymentMethod: string;
  reference: string;
  timestamp: string;
}

/** One booking joined with its transaction. This is what the dashboards render. */
export interface LedgerRow {
  id: string;
  reference: string;
  gigId: string | null;
  gigTitle: string;
  category: string;
  client: PublicUser | null;
  freelancer: PublicUser | null;
  amount: number;
  status: BookingStatus;
  date: string;
  scheduledDate: string;
  requirements: string;
  /** True when the money should count towards income / spend totals. */
  counted: boolean;
}

export interface GigPayload {
  title: string;
  description: string;
  category: string;
  price: number;
  deliveryTimeDays: number;
  status: GigStatus;
}

/** Plain language figures worked out by the server from the income so far. */
export interface TaxInsights {
  projectedAnnualIncome: number;
  projectedAnnualTax: number;
  setAsidePercent: number;
  setAsidePerThousand: number;
  threshold: { amount: number; progressPercent: number; remaining: number; reached: boolean };
  nextBracket: { startsAt: number; rate: number; remaining: number } | null;
  basis: { method: string; daysElapsed: number; daysInYear: number };
}

/** What GET /api/transactions/tax-estimate returns for the logged in freelancer. */
export interface TaxEstimate {
  taxYear: { label: string; startsOn: string; endsOn: string };
  rates: { label: string; outOfDate: boolean };
  currency: string;
  income: number;
  paymentCount: number;
  tax: number;
  effectiveRate: number;
  afterTax: number;
  belowThreshold: boolean;
  bracket: { from: number; upTo: number | null; rate: number };
  insights: TaxInsights;
  disclaimer: string;
}

/** The kinds of security event the API records in the audit trail. */
export type AuditEventType =
  "register" | "login" | "login_2fa" | "account_lockout" | "password_change" | "password_reset" | "two_factor_change";

/** One stored security event. The account shows a username and role only, never an email address. */
export interface AuditEvent {
  id: string;
  type: AuditEventType;
  outcome: "success" | "failure";
  detail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { username: string; role: string } | null;
}

/** What GET /api/admin/audit-events returns: one page of events and the paging details. */
export interface AuditEventsPage {
  success: boolean;
  data: AuditEvent[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}
