import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GigDetailPage } from "./GigDetailPage.tsx";
import { createBooking, getGig } from "../services/marketApi.ts";
import type { Gig } from "../models/market.ts";
import { loginAs, renderAt } from "../test/helpers.tsx";

vi.mock("../services/marketApi.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/marketApi.ts")>()),
  getGig: vi.fn(),
  createBooking: vi.fn(),
}));

const GIG_ID = "64b7f0c2a1b2c3d4e5f60718";

const gig: Gig = {
  _id: GIG_ID,
  title: "Brand identity kit",
  description: "A complete logo, palette and type system for your business.",
  category: "Graphic & Design",
  price: 2500,
  deliveryTimeDays: 5,
  status: "active",
  freelancer: { _id: "f1", username: "Thandi Mokoena" },
  createdAt: "2026-10-01T10:00:00Z",
};

const page = (
  <Routes>
    <Route path='/gigs/:id' element={<GigDetailPage />} />
    <Route path='/bookings' element={<p>bookings page</p>} />
  </Routes>
);

// Matches the accessible name the date picker gives each day button
const dayLabel = (d: Date) =>
  d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

describe("booking flow", () => {
  beforeEach(() => {
    loginAs("client");
    vi.mocked(getGig).mockResolvedValue(gig);
    vi.mocked(createBooking).mockReset();
    vi.mocked(getGig).mockClear();
  });

  it("requires a brief before continuing", async () => {
    renderAt(page, `/gigs/${GIG_ID}`);
    await userEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    expect(screen.getByText(/Add a brief of 10 to 1000 characters/i)).toBeInTheDocument();
  });

  it("books a gig and shows the transaction receipt", async () => {
    vi.mocked(createBooking).mockResolvedValue({
      booking: {} as never,
      transaction: {
        _id: "t1",
        bookingId: "b1",
        amount: 2500,
        status: "completed",
        paymentMethod: "simulated_card",
        reference: "TXN-ABC123",
        timestamp: "2026-10-08T10:00:00Z",
      },
    });
    renderAt(page, `/gigs/${GIG_ID}`);
    await userEvent.type(await screen.findByLabelText("Project brief"), "Need a full brand kit for my bakery.");
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Confirm and pay" }));
    await waitFor(() =>
      expect(createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          gigId: GIG_ID,
          requirements: "Need a full brand kit for my bakery.",
          paymentMethod: "simulated_card",
        }),
      ),
    );
    expect(await screen.findByText("TXN-ABC123")).toBeInTheDocument();
  });

  it("does not let a past date be picked and shows the chosen date in the summary", async () => {
    renderAt(page, `/gigs/${GIG_ID}`);
    await userEvent.type(await screen.findByLabelText("Project brief"), "Need a full brand kit for my bakery.");
    await userEvent.click(screen.getByLabelText(/Preferred date/));

    const now = new Date();
    if (now.getDate() > 1) {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      expect(screen.getByRole("button", { name: dayLabel(yesterday) })).toBeDisabled();
    }

    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (tomorrow.getMonth() !== now.getMonth())
      await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    await userEvent.click(screen.getByRole("button", { name: dayLabel(tomorrow) }));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(screen.queryByText("Choose today or a future date.")).not.toBeInTheDocument();
    expect(await screen.findByText("Preferred date")).toBeInTheDocument();
  });

  it("strips markup from the brief before it is sent", async () => {
    vi.mocked(createBooking).mockResolvedValue({
      booking: {} as never,
      transaction: {
        _id: "t1",
        bookingId: "b1",
        amount: 2500,
        status: "completed",
        paymentMethod: "simulated_card",
        reference: "TXN-1",
        timestamp: "2026-10-08T10:00:00Z",
      },
    });
    renderAt(page, `/gigs/${GIG_ID}`);
    await userEvent.type(
      await screen.findByLabelText("Project brief"),
      "Need a <script>alert(1)</script>logo for my shop",
    );
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Confirm and pay" }));
    await waitFor(() => expect(createBooking).toHaveBeenCalled());
    const sent = vi.mocked(createBooking).mock.calls[0][0].requirements;
    expect(sent).not.toMatch(/[<>]/);
    expect(sent).toContain("Need a");
  });

  it("never calls the API for an invalid gig id in the URL", () => {
    renderAt(page, "/gigs/not-a-real-id");
    expect(screen.getByText(/no longer available/i)).toBeInTheDocument();
    expect(getGig).not.toHaveBeenCalled();
  });
});
