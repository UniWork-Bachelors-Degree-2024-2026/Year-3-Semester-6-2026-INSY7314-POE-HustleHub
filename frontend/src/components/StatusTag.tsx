import type { BookingStatus } from "../models/market.ts";

const MAP: Record<BookingStatus, [string, string]> = {
  pending: ["Pending", "tag-warn"],
  confirmed: ["Confirmed", "tag-live"],
  in_progress: ["In progress", "tag-live"],
  completed: ["Delivered", "tag-done"],
  cancelled: ["Cancelled", "tag-bad"],
};

export function StatusTag({ status }: { status: BookingStatus }) {
  const [label, cls] = MAP[status] ?? [status, "tag-muted"];
  return <span className={`tag ${cls}`}>{label}</span>;
}
