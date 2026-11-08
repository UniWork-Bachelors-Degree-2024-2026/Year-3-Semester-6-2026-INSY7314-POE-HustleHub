import { useCallback } from "react";
import { getBookings, getTransactions } from "../services/marketApi.ts";
import { useApi } from "./useApi";
import type { Booking, LedgerRow, Transaction } from "../models/market.ts";

export function buildLedger(bookings: Booking[], transactions: Transaction[]): LedgerRow[] {
  const byBooking = new Map<string, Transaction>();
  for (const t of transactions) {
    const id = typeof t.bookingId === "string" ? t.bookingId : t.bookingId?._id;
    if (id) byBooking.set(id, t);
  }
  return bookings
    .map((b) => {
      const t = byBooking.get(b._id);
      const txnOk = (t?.status ?? "completed") === "completed";
      return {
        id: b._id,
        reference: t?.reference ?? "Pending",
        gigId: b.gig?._id ?? null,
        gigTitle: b.gig?.title ?? "Deleted gig",
        category: b.gig?.category ?? "Other",
        client: b.client,
        freelancer: b.freelancer,
        amount: t?.amount ?? b.price,
        status: b.status,
        date: t?.timestamp ?? b.createdAt,
        scheduledDate: b.scheduledDate,
        requirements: b.requirements,
        // Cancelled bookings never count as income or spend, even if the transaction row was not reversed.
        counted: b.status !== "cancelled" && txnOk,
      } satisfies LedgerRow;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Bookings joined with their transactions, scoped to the logged-in user by the API. */
export function useLedger() {
  const fetcher = useCallback(async () => {
    const [bookings, transactions] = await Promise.all([getBookings(), getTransactions()]);
    return buildLedger(bookings, transactions);
  }, []);
  return useApi(fetcher);
}
