import { describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GigCard } from "./GigCard.tsx";
import { ProtectedRoute } from "./ProtectedRoute.tsx";
import { RoleLinks } from "./RoleLinks.tsx";
import { RoleRoute } from "./RoleRoute.tsx";
import { StatusTag } from "./StatusTag.tsx";
import { buildLedger } from "../hooks/useLedger.ts";
import type { Booking, Transaction } from "../models/market.ts";
import { loginAs, renderAt } from "../test/helpers.tsx";

describe("GigCard", () => {
  it("renders gig details and reacts to clicks", async () => {
    const onOpen = vi.fn();
    renderAt(
      <GigCard
        title='Logo design'
        category='Graphic & Design'
        price={1500}
        days={5}
        owner='Thandi Mokoena'
        onOpen={onOpen}
      />,
    );
    expect(screen.getByText("Logo design")).toBeInTheDocument();
    expect(screen.getByText("R 1 500")).toBeInTheDocument();
    expect(screen.getByText("5 days")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe("role-based route guards", () => {
  const tree = (
    <Routes>
      <Route path='/login' element={<p>login screen</p>} />
      <Route
        element={
          <ProtectedRoute>
            <RoleRoute roles={["freelancer"]} />
          </ProtectedRoute>
        }
      >
        <Route path='/my-gigs' element={<p>freelancer gigs</p>} />
      </Route>
    </Routes>
  );
  it("redirects anonymous users to login", () => {
    renderAt(tree, "/my-gigs");
    expect(screen.getByText("login screen")).toBeInTheDocument();
  });
  it("blocks a client from a freelancer page", () => {
    loginAs("client");
    renderAt(tree, "/my-gigs");
    expect(screen.getByText(/isn't available for your account/i)).toBeInTheDocument();
    expect(screen.queryByText("freelancer gigs")).not.toBeInTheDocument();
  });
  it("lets the right role through", () => {
    loginAs("freelancer");
    renderAt(tree, "/my-gigs");
    expect(screen.getByText("freelancer gigs")).toBeInTheDocument();
  });
});

describe("nav links per role", () => {
  it("shows marketplace links for clients and gig links for freelancers", () => {
    const { unmount } = renderAt(<RoleLinks role='client' />);
    expect(screen.getByRole("link", { name: "Explore" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My gigs" })).not.toBeInTheDocument();
    unmount();
    renderAt(<RoleLinks role='freelancer' />);
    expect(screen.getByRole("link", { name: "My gigs" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Explore" })).not.toBeInTheDocument();
  });
});

describe("StatusTag and ledger", () => {
  it("labels booking statuses", () => {
    renderAt(<StatusTag status='completed' />);
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });
  it("joins bookings to transactions and excludes cancelled bookings from income", () => {
    const mk = (id: string, status: Booking["status"]): Booking => ({
      _id: id,
      client: { _id: "c", username: "C" },
      freelancer: { _id: "f", username: "F" },
      gig: { _id: "g", title: "G", category: "Other", price: 100, deliveryTimeDays: 1 },
      price: 100,
      status,
      scheduledDate: "2026-10-01",
      requirements: "",
      createdAt: "2026-10-01T10:00:00Z",
    });
    const tx = (id: string, b: string): Transaction => ({
      _id: id,
      bookingId: { _id: b },
      amount: 100,
      status: "completed",
      paymentMethod: "simulated_card",
      reference: "TXN-" + id,
      timestamp: "2026-10-01T10:00:00Z",
    });
    const rows = buildLedger([mk("b1", "completed"), mk("b2", "cancelled")], [tx("t1", "b1"), tx("t2", "b2")]);
    expect(rows.find((r) => r.id === "b1")?.counted).toBe(true);
    expect(rows.find((r) => r.id === "b2")?.counted).toBe(false);
    expect(rows.find((r) => r.id === "b1")?.reference).toBe("TXN-t1");
  });
});
