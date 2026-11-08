import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilePage } from "./ProfilePage.tsx";
import { ApiError, updateProfile } from "../services/api.ts";
import { loadProfile } from "../services/profileStore.ts";
import { getUser } from "../services/session.ts";
import { ToastProvider } from "../components/ToastProvider.tsx";
import { loginAs, renderAt } from "../test/helpers.tsx";

vi.mock("../services/api.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/api.ts")>()),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}));

vi.mock("../services/marketApi.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/marketApi.ts")>()),
  savePublicProfile: vi.fn().mockResolvedValue({ message: "ok" }),
}));

// jsdom has no canvas, so the spark animation is switched off
HTMLCanvasElement.prototype.getContext = () => null;

const page = (
  <ToastProvider>
    <Routes>
      <Route path='/profile' element={<ProfilePage />} />
      <Route path='/login' element={<p>login page</p>} />
    </Routes>
  </ToastProvider>
);

const saveButton = () => screen.getByRole("button", { name: /save changes/i });

describe("profile page", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(updateProfile).mockReset();
  });

  it("starts with Save switched off and shows the logged in user", () => {
    loginAs("freelancer");
    renderAt(page, "/profile");
    expect(screen.getByLabelText("Username")).toHaveValue("Test User");
    expect(screen.getByLabelText("Email")).toHaveValue("t@example.com");
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });

  it("shows freelancer and client tabs for their own role only", () => {
    loginAs("freelancer");
    const { unmount } = renderAt(page, "/profile");
    expect(screen.getByRole("tab", { name: "Skills & rates" })).toBeInTheDocument();
    unmount();
    sessionStorage.clear();
    loginAs("client");
    renderAt(page, "/profile");
    expect(screen.getByRole("tab", { name: "Company" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Skills & rates" })).not.toBeInTheDocument();
  });

  it("updates the live preview as you type and saves details on this device", async () => {
    loginAs("freelancer");
    renderAt(page, "/profile");
    const headline = screen.getByLabelText("Headline");
    await userEvent.type(headline, "Brand designer");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByText("Brand designer")).toBeInTheDocument();

    await userEvent.click(saveButton());
    await waitFor(() => expect(loadProfile("u1").headline).toBe("Brand designer"));
    expect(updateProfile).not.toHaveBeenCalled();
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });

  it("blocks markup characters while typing", async () => {
    loginAs("client");
    renderAt(page, "/profile");
    const bio = screen.getByLabelText("Bio");
    await userEvent.type(bio, "Hi <script>alert(1)</script>");
    expect(bio).toHaveValue("Hi scriptalert(1)/script");
  });

  it("rejects a website that is not https and jumps to the problem", async () => {
    loginAs("client");
    renderAt(page, "/profile");
    await userEvent.type(screen.getByLabelText("Website"), "http://plain.example.com");
    await userEvent.click(saveButton());
    expect(await screen.findByText("Website must start with https://")).toBeInTheDocument();
    expect(loadProfile("u1").website).toBe("");
  });

  it("adds https:// to a bare website address", async () => {
    loginAs("client");
    renderAt(page, "/profile");
    await userEvent.type(screen.getByLabelText("Website"), "mysite.co.za");
    await userEvent.click(saveButton());
    await waitFor(() => expect(loadProfile("u1").website).toBe("https://mysite.co.za"));
  });

  it("only accepts a LinkedIn address on linkedin.com", async () => {
    loginAs("freelancer");
    renderAt(page, "/profile");
    await userEvent.type(screen.getByLabelText("LinkedIn"), "https://evil.example.com/in/me");
    await userEvent.click(saveButton());
    expect(await screen.findByText("LinkedIn must be a linkedin.com address.")).toBeInTheDocument();
  });

  it("sends a changed username to the API and updates the saved session", async () => {
    loginAs("freelancer");
    vi.mocked(updateProfile).mockResolvedValue({
      _id: "u1",
      username: "New Name",
      email: "t@example.com",
      role: "freelancer",
    });
    renderAt(page, "/profile");
    const name = screen.getByLabelText("Username");
    await userEvent.clear(name);
    await userEvent.type(name, "New Name");
    await userEvent.click(saveButton());
    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith("test-token", { username: "New Name", email: "t@example.com" }),
    );
    await waitFor(() => expect(getUser()?.username).toBe("New Name"));
  });

  it("keeps the old account details and says why when the server cannot update them", async () => {
    loginAs("freelancer");
    vi.mocked(updateProfile).mockRejectedValue(new ApiError("Not found", [], 404));
    renderAt(page, "/profile");
    const name = screen.getByLabelText("Username");
    await userEvent.clear(name);
    await userEvent.type(name, "Other Name");
    await userEvent.type(screen.getByLabelText("Headline"), "Still saved");
    await userEvent.click(saveButton());
    expect(await screen.findByText(/username and email were left as they were/i)).toBeInTheDocument();
    expect(getUser()?.username).toBe("Test User");
    expect(loadProfile("u1").headline).toBe("Still saved");
    expect(screen.getByLabelText("Username")).toHaveValue("Test User");
  });

  it("adds skills as tags and removes them again", async () => {
    loginAs("freelancer");
    renderAt(page, "/profile");
    await userEvent.click(screen.getByRole("tab", { name: "Skills & rates" }));
    const skills = screen.getByLabelText("Skills");
    await userEvent.type(skills, "React{Enter}Figma,");
    expect(screen.getAllByText("React").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Remove React" }));
    expect(screen.queryByRole("button", { name: "Remove React" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Figma" })).toBeInTheDocument();
  });

  it("only accepts digits in the hourly rate", async () => {
    loginAs("freelancer");
    renderAt(page, "/profile");
    await userEvent.click(screen.getByRole("tab", { name: "Skills & rates" }));
    const rate = screen.getByLabelText("Hourly rate (R)");
    await userEvent.type(rate, "4a5b0.9");
    expect(rate).toHaveValue("4509");
  });

  it("refuses a file that is not an image before opening the cropper", async () => {
    loginAs("client");
    renderAt(page, "/profile");
    const input = document.getElementById("pf-file") as HTMLInputElement;
    const fake = new File(["<script>alert(1)</script>"], "photo.png", { type: "image/png" });
    await userEvent.upload(input, fake);
    expect(await screen.findByText(/not a real JPG, PNG or WebP image|larger than|empty/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ignores tampered profile data in storage", async () => {
    loginAs("client");
    localStorage.setItem(
      "hh_profile_u1",
      JSON.stringify({
        avatar: "javascript:alert(1)",
        headline: "<img src=x onerror=alert(1)>Hello",
        banner: "nope",
        skills: "x",
      }),
    );
    renderAt(page, "/profile");
    expect(screen.getByLabelText("Headline")).toHaveValue("Hello");
    expect(document.querySelector("img[src^='javascript']")).toBeNull();
  });
});
