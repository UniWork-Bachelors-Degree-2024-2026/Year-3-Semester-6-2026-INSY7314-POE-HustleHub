import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import { PublicProfilePage } from "./PublicProfilePage.tsx";
import { ApiError } from "../services/api.ts";
import { getBookings, getGigsBy, getPublicProfile } from "../services/marketApi.ts";
import { loadProfile, saveProfile } from "../services/profileStore.ts";
import { EMPTY_PROFILE } from "../models/profile.ts";
import { saveSession } from "../services/session.ts";
import { loginAs, makeUser, renderAt } from "../test/helpers.tsx";

vi.mock("../services/marketApi.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/marketApi.ts")>()),
  getGigsBy: vi.fn(),
  getPublicProfile: vi.fn(),
  getBookings: vi.fn(),
}));

const OTHER = "507f1f77bcf86cd799439011";
const page = (
  <Routes>
    <Route path='/u/:id' element={<PublicProfilePage />} />
  </Routes>
);

const gig = (id: string) => ({
  _id: id,
  title: "Logo and brand kit",
  description: "d",
  category: "Graphic & Design",
  price: 1500,
  deliveryTimeDays: 5,
  status: "active" as const,
  freelancer: { _id: OTHER, username: "Thandi Dube" },
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("public profile page", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getGigsBy).mockReset().mockResolvedValue([]);
    vi.mocked(getPublicProfile)
      .mockReset()
      .mockRejectedValue(new ApiError("nope", [], 404));
    vi.mocked(getBookings).mockReset().mockResolvedValue([]);
  });

  it("shows a freelancer's details and live gigs to a client", async () => {
    loginAs("client");
    vi.mocked(getGigsBy).mockResolvedValue([gig("507f1f77bcf86cd799439022")]);
    vi.mocked(getPublicProfile).mockResolvedValue({
      _id: OTHER,
      username: "Thandi Dube",
      role: "freelancer",
      stats: { completedBookings: 12, memberSince: "2025-03-01T00:00:00.000Z" },
      profile: {
        ...EMPTY_PROFILE,
        headline: "Brand designer",
        bio: "I design memorable brands for small businesses across Cape Town.",
        skills: ["Branding", "Figma", "Logo design"],
        hourlyRate: "450",
      },
    });
    renderAt(page, `/u/${OTHER}`);
    expect(await screen.findByText("Logo and brand kit")).toBeInTheDocument();
    expect(screen.getAllByText(/memorable brands/).length).toBeGreaterThan(0);
    expect(screen.getByText("Completed bookings")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "See their work" })).toBeInTheDocument();
  });

  it("lets a freelancer check a client, including their shared history", async () => {
    loginAs("freelancer");
    vi.mocked(getPublicProfile).mockResolvedValue({
      _id: OTHER,
      username: "Karoo Coffee",
      role: "client",
      profile: {
        ...EMPTY_PROFILE,
        company: "Karoo Coffee Co.",
        website: "https://karoocoffee.co.za",
        hiring: ["Graphic & Design"],
      },
    });
    vi.mocked(getBookings).mockResolvedValue([
      {
        _id: "b1",
        client: { _id: OTHER, username: "Karoo Coffee" },
        freelancer: { _id: "u1", username: "Test User" },
        gig: { _id: "g1", title: "Menu design", category: "Graphic & Design", price: 800, deliveryTimeDays: 3 },
        price: 800,
        status: "completed",
        scheduledDate: "2026-02-01T00:00:00.000Z",
        requirements: "x",
        createdAt: "2026-02-01T00:00:00.000Z",
      },
    ]);
    renderAt(page, `/u/${OTHER}`);
    expect(await screen.findByText("Is this client legit?")).toBeInTheDocument();
    expect(screen.getAllByText("Karoo Coffee Co.").length).toBeGreaterThan(0);
    expect(screen.getByText("Your history together")).toBeInTheDocument();
    expect(screen.getByText("Menu design")).toBeInTheDocument();
    expect(screen.getByText("1 (1 delivered)")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /karoocoffee\.co\.za/ });
    expect(link).toHaveAttribute("href", "https://karoocoffee.co.za");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("never turns an unsafe link from another member into a clickable link", async () => {
    loginAs("client");
    vi.mocked(getGigsBy).mockResolvedValue([gig("507f1f77bcf86cd799439022")]);
    vi.mocked(getPublicProfile).mockResolvedValue({
      _id: OTHER,
      username: "Thandi Dube",
      role: "freelancer",
      profile: {
        ...EMPTY_PROFILE,
        website: "javascript:alert(1)",
        linkedin: "https://evil.example.com/in/me",
        avatar: "javascript:alert(1)",
        headline: "<img src=x onerror=alert(1)>Safe headline",
      },
    });
    renderAt(page, `/u/${OTHER}`);
    expect(await screen.findByText("Logo and brand kit")).toBeInTheDocument();
    expect(document.querySelector("a[href^='javascript']")).toBeNull();
    expect(screen.queryByRole("link", { name: /evil\.example\.com|LinkedIn/ })).not.toBeInTheDocument();
    expect(document.querySelector("img[src^='javascript']")).toBeNull();
    expect(document.querySelector("img[onerror]")).toBeNull();
  });

  it("says when a member has not shared details yet", async () => {
    loginAs("client");
    vi.mocked(getGigsBy).mockResolvedValue([gig("507f1f77bcf86cd799439022")]);
    renderAt(page, `/u/${OTHER}`);
    expect(await screen.findByText(/has not shared more details yet/)).toBeInTheDocument();
    expect(screen.getByText("Logo and brand kit")).toBeInTheDocument();
  });

  it("shows your own profile with an edit button and respects the visibility setting", async () => {
    const MINE = "507f1f77bcf86cd799439033";
    saveSession({ ...makeUser("freelancer"), _id: MINE, token: "test-token" });
    saveProfile(MINE, { ...loadProfile(MINE), headline: "My headline", visible: false });
    renderAt(page, `/u/${MINE}`);
    expect(await screen.findByRole("link", { name: "Edit profile" })).toHaveAttribute("href", "/profile");
    expect(screen.getByText(/Your profile is hidden/)).toBeInTheDocument();
    expect(getPublicProfile).not.toHaveBeenCalled();
  });

  it("reports an unknown member", async () => {
    loginAs("client");
    renderAt(page, `/u/${OTHER}`);
    expect(await screen.findByText("We could not find that profile.")).toBeInTheDocument();
  });

  it("refuses an id that is not a real id", () => {
    loginAs("client");
    renderAt(page, "/u/not-an-id");
    expect(getGigsBy).not.toHaveBeenCalled();
  });
});
