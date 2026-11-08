import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuditLog } from "./AuditLog.tsx";
import { ApiError } from "../services/api.ts";
import { getAuditEvents } from "../services/marketApi.ts";
import type { AuditEvent, AuditEventsPage } from "../models/market.ts";
import { dtime } from "../utils/format.ts";

vi.mock("../services/marketApi.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/marketApi.ts")>()),
  getAuditEvents: vi.fn(),
}));

const failedLogin: AuditEvent = {
  id: "e1",
  type: "login",
  outcome: "failure",
  detail: "wrong password",
  ip: "::1",
  userAgent: "Mozilla/5.0",
  createdAt: "2026-11-07T10:15:00.000Z",
  user: { username: "Thandi", role: "freelancer" },
};

const lockout: AuditEvent = {
  id: "e2",
  type: "account_lockout",
  outcome: "failure",
  detail: "too many failed logins",
  ip: "10.0.0.5",
  userAgent: null,
  createdAt: "2026-11-07T10:16:00.000Z",
  user: null,
};

const firstPage: AuditEventsPage = {
  success: true,
  data: [failedLogin, lockout],
  page: 1,
  limit: 10,
  total: 12,
  pages: 2,
};

describe("AuditLog", () => {
  beforeEach(() => {
    vi.mocked(getAuditEvents).mockReset();
  });

  it("shows a loading state and then the events with plain language names", async () => {
    vi.mocked(getAuditEvents).mockResolvedValue(firstPage);
    render(<AuditLog />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "Security audit trail" })).toBeInTheDocument();
    // within limits the queries to the table, and the first row is the header (Testing Library, 2026d).
    const rows = within(await screen.findByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText("Login")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Failed")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Thandi")).toBeInTheDocument();
    expect(within(rows[1]).getByText("wrong password")).toBeInTheDocument();
    expect(within(rows[1]).getByText(dtime(failedLogin.createdAt))).toBeInTheDocument();
    expect(within(rows[2]).getByText("Account lockout")).toBeInTheDocument();
  });

  it("shows Unknown for an event that belongs to no account", async () => {
    vi.mocked(getAuditEvents).mockResolvedValue(firstPage);
    render(<AuditLog />);
    const rows = within(await screen.findByRole("table")).getAllByRole("row");
    expect(within(rows[2]).getByText("Unknown")).toBeInTheDocument();
  });

  it("does not show an email address anywhere on the page", async () => {
    vi.mocked(getAuditEvents).mockResolvedValue(firstPage);
    const { container } = render(<AuditLog />);
    await screen.findByRole("table");
    expect(container.textContent?.includes("@")).toBe(false);
  });

  it("shows the paging details and moves to the next page", async () => {
    vi.mocked(getAuditEvents).mockResolvedValue(firstPage);
    render(<AuditLog />);
    expect(await screen.findByText("Page 1 of 2 | 12 events")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    vi.mocked(getAuditEvents).mockResolvedValue({ ...firstPage, page: 2, data: [lockout] });
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Page 2 of 2 | 12 events")).toBeInTheDocument();
    expect(getAuditEvents).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("asks for the chosen type and starts again from the first page", async () => {
    vi.mocked(getAuditEvents).mockResolvedValue({ ...firstPage, page: 2 });
    render(<AuditLog />);
    await screen.findByRole("table");

    vi.mocked(getAuditEvents).mockResolvedValue({ ...firstPage, data: [failedLogin], total: 1, pages: 1 });
    // selectOptions picks an option of the dropdown the way a user would (Testing Library, 2026e).
    await userEvent.selectOptions(screen.getByLabelText("Event type"), "login");

    await waitFor(() => expect(getAuditEvents).toHaveBeenLastCalledWith(1, "login"));
    expect(await screen.findByText("Page 1 of 1 | 1 events")).toBeInTheDocument();
  });

  it("says so when no events have been recorded", async () => {
    vi.mocked(getAuditEvents).mockResolvedValue({ ...firstPage, data: [], total: 0, pages: 1 });
    render(<AuditLog />);
    expect(await screen.findByText("No security events have been recorded yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an error and lets the admin try again", async () => {
    vi.mocked(getAuditEvents)
      .mockRejectedValueOnce(new ApiError("Something went wrong on our side. Please try again shortly.", [], 500))
      .mockResolvedValue(firstPage);
    render(<AuditLog />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong on our side");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});

// Reference List:
// Testing Library, 2026d. Querying Within Elements. [online] Available at: <https://testing-library.com/docs/dom-testing-library/api-within/> [Accessed 7 November 2026].
// Testing Library, 2026e. Utility APIs. [online] Available at: <https://testing-library.com/docs/user-event/utility/> [Accessed 7 November 2026].
