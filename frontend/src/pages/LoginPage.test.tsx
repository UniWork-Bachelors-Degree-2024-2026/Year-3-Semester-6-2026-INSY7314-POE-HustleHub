import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "./LoginPage.tsx";
import { ApiError, loginUser, verifyLoginCode } from "../services/api.ts";
import { getUser } from "../services/session.ts";
import { makeUser, renderAt } from "../test/helpers.tsx";

vi.mock("../services/api.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/api.ts")>()),
  loginUser: vi.fn(),
  verifyLoginCode: vi.fn(),
}));

const page = (
  <Routes>
    <Route path='/login' element={<LoginPage />} />
    <Route path='/dashboard' element={<p>dashboard page</p>} />
  </Routes>
);
const submit = () => userEvent.click(screen.getByRole("button", { name: "Log in" }));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.mocked(loginUser).mockReset();
    vi.mocked(verifyLoginCode).mockReset();
    sessionStorage.clear();
  });

  it("renders the login form", () => {
    renderAt(page, "/login");
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("links to the forgot password page", () => {
    renderAt(page, "/login");
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute("href", "/forgot-password");
  });

  it("shows validation errors and does not call the API for empty input", async () => {
    renderAt(page, "/login");
    await submit();
    expect(await screen.findByText(/valid email address|Email is required/i)).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(loginUser).not.toHaveBeenCalled();
  });

  it("logs in, stores the session and opens the dashboard", async () => {
    vi.mocked(loginUser).mockResolvedValue({ ...makeUser("freelancer"), token: "abc" });
    renderAt(page, "/login");
    await userEvent.type(screen.getByLabelText("Email"), "Me@Example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Str0ng!Pass");
    await submit();
    await waitFor(() => expect(loginUser).toHaveBeenCalledWith({ email: "me@example.com", password: "Str0ng!Pass" }));
    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
    expect(getUser()?.role).toBe("freelancer");
  });

  it("shows the generic server message when credentials are rejected", async () => {
    vi.mocked(loginUser).mockRejectedValue(new ApiError("Invalid credentials.", [], 400));
    renderAt(page, "/login");
    await userEvent.type(screen.getByLabelText("Email"), "me@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Wrong!Pass1");
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials.");
    expect(getUser()).toBeNull();
  });

  // Own security feature: two-factor login
  describe("two-factor login", () => {
    const challenge = {
      twoFactorRequired: true as const,
      email: "me@example.com",
      message: "We have sent a login code to your email address.",
      expiresInMinutes: 10,
      resendAfterSeconds: 60,
    };

    const reachCodeStep = async () => {
      vi.mocked(loginUser).mockResolvedValue(challenge);
      renderAt(page, "/login");
      await userEvent.type(screen.getByLabelText("Email"), "me@example.com");
      await userEvent.type(screen.getByLabelText("Password"), "Str0ng!Pass");
      await submit();
      await screen.findByRole("heading", { name: "Check your email" });
    };

    const typeCode = async (code: string) => {
      await userEvent.click(screen.getAllByRole("textbox")[0]);
      await userEvent.keyboard(code);
    };

    it("asks for the emailed code and does not store a session after the password step", async () => {
      await reachCodeStep();
      expect(getUser()).toBeNull();
      expect(screen.getByRole("button", { name: "Confirm and log in" })).toBeInTheDocument();
    });

    it("logs in once the correct code is confirmed", async () => {
      vi.mocked(verifyLoginCode).mockResolvedValue({ ...makeUser("freelancer"), token: "abc" });
      await reachCodeStep();
      await typeCode("482915");
      await userEvent.click(screen.getByRole("button", { name: "Confirm and log in" }));
      await waitFor(() => expect(verifyLoginCode).toHaveBeenCalledWith({ email: "me@example.com", code: "482915" }));
      expect(await screen.findByText("dashboard page")).toBeInTheDocument();
      expect(getUser()?.role).toBe("freelancer");
    });

    it("does not call the server for an incomplete code", async () => {
      await reachCodeStep();
      await typeCode("123");
      await userEvent.click(screen.getByRole("button", { name: "Confirm and log in" }));
      expect(await screen.findByText("The code must be exactly 6 digits.")).toBeInTheDocument();
      expect(verifyLoginCode).not.toHaveBeenCalled();
    });

    it("shows a wrong code error and keeps the user logged out", async () => {
      vi.mocked(verifyLoginCode).mockRejectedValue(new ApiError("That code is incorrect or has expired.", [], 400));
      await reachCodeStep();
      await typeCode("000000");
      await userEvent.click(screen.getByRole("button", { name: "Confirm and log in" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("incorrect or has expired");
      expect(getUser()).toBeNull();
    });

    it("returns to the password form from the code step", async () => {
      await reachCodeStep();
      await userEvent.click(screen.getByRole("button", { name: "Back to log in" }));
      expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    });
  });

  it("shows the lockout message when the account is locked", async () => {
    vi.mocked(loginUser).mockRejectedValue(
      new ApiError("Too many failed login attempts. Please try again in 15 minutes.", [], 429, 900),
    );
    renderAt(page, "/login");
    await userEvent.type(screen.getByLabelText("Email"), "me@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Wrong!Pass1");
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many failed login attempts");
  });
});
