import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterPage } from "./RegisterPage.tsx";
import { ApiError, resendRegistrationCode, startRegistration, verifyRegistration } from "../services/api.ts";
import { getUser } from "../services/session.ts";
import { makeUser, renderAt } from "../test/helpers.tsx";

vi.mock("../services/api.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/api.ts")>()),
  startRegistration: vi.fn(),
  verifyRegistration: vi.fn(),
  resendRegistrationCode: vi.fn(),
}));

const page = (
  <Routes>
    <Route path='/register' element={<RegisterPage />} />
    <Route path='/dashboard' element={<p>dashboard page</p>} />
  </Routes>
);

const started = { message: "We have sent a verification code.", expiresInMinutes: 10, resendAfterSeconds: 60 };

// Form fields are found by their label text (Testing Library, 2026a).
async function fill(password: string, confirm: string) {
  await userEvent.type(screen.getByLabelText("Username"), "Thandi");
  await userEvent.type(screen.getByLabelText("Email"), "thandi@example.com");
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.type(screen.getByLabelText("Confirm password"), confirm);
  await userEvent.click(screen.getByRole("button", { name: "Send verification code" }));
}

async function typeCode(code: string) {
  await userEvent.click(screen.getAllByRole("textbox")[0]);
  await userEvent.keyboard(code);
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.mocked(startRegistration).mockReset();
    vi.mocked(verifyRegistration).mockReset();
    vi.mocked(resendRegistrationCode).mockReset();
    sessionStorage.clear();
  });

  it("blocks weak passwords", async () => {
    renderAt(page, "/register");
    await fill("weak", "weak");
    expect(await screen.findByText(/does not meet the complexity requirements/i)).toBeInTheDocument();
    expect(startRegistration).not.toHaveBeenCalled();
  });

  it("blocks mismatched passwords", async () => {
    renderAt(page, "/register");
    await fill("Str0ng!Pass", "Different1!");
    expect(await screen.findByText("Passwords don't match.")).toBeInTheDocument();
    expect(startRegistration).not.toHaveBeenCalled();
  });

  it("requests a code with the chosen role and shows the code step", async () => {
    vi.mocked(startRegistration).mockResolvedValue(started);
    renderAt(page, "/register");
    await userEvent.click(screen.getByRole("button", { name: /Sell my skills/i }));
    await fill("Str0ng!Pass", "Str0ng!Pass");
    await waitFor(() =>
      expect(startRegistration).toHaveBeenCalledWith({
        username: "Thandi",
        email: "thandi@example.com",
        password: "Str0ng!Pass",
        role: "freelancer",
      }),
    );
    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText("thandi@example.com")).toBeInTheDocument();
    expect(getUser()).toBeNull();
  });

  it("sanitises the username before it is validated and sent", async () => {
    vi.mocked(startRegistration).mockResolvedValue(started);
    renderAt(page, "/register");
    await userEvent.type(screen.getByLabelText("Username"), "Thandi<script>");
    await userEvent.type(screen.getByLabelText("Email"), "  Thandi@Example.com ");
    await userEvent.type(screen.getByLabelText("Password"), "Str0ng!Pass");
    await userEvent.type(screen.getByLabelText("Confirm password"), "Str0ng!Pass");
    await userEvent.click(screen.getByRole("button", { name: "Send verification code" }));
    await waitFor(() =>
      expect(startRegistration).toHaveBeenCalledWith({
        username: "Thandi",
        email: "thandi@example.com",
        password: "Str0ng!Pass",
        role: "client",
      }),
    );
  });

  it("shows the server message when the email is already registered", async () => {
    vi.mocked(startRegistration).mockRejectedValue(
      new ApiError("User already exists with that email address.", [], 400),
    );
    renderAt(page, "/register");
    await fill("Str0ng!Pass", "Str0ng!Pass");
    expect(await screen.findByRole("alert")).toHaveTextContent("User already exists");
    expect(screen.queryByRole("heading", { name: "Check your email" })).not.toBeInTheDocument();
  });

  it("confirms the code, stores the session and opens the dashboard", async () => {
    vi.mocked(startRegistration).mockResolvedValue(started);
    vi.mocked(verifyRegistration).mockResolvedValue({ ...makeUser("client"), token: "abc" });
    renderAt(page, "/register");
    await fill("Str0ng!Pass", "Str0ng!Pass");
    await screen.findByRole("heading", { name: "Check your email" });
    await typeCode("482915");
    await userEvent.click(screen.getByRole("button", { name: "Confirm and create account" }));
    await waitFor(() =>
      expect(verifyRegistration).toHaveBeenCalledWith({ email: "thandi@example.com", code: "482915" }),
    );
    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
    expect(getUser()?.email).toBe("t@example.com");
  });

  it("does not call the server for an incomplete code", async () => {
    vi.mocked(startRegistration).mockResolvedValue(started);
    renderAt(page, "/register");
    await fill("Str0ng!Pass", "Str0ng!Pass");
    await screen.findByRole("heading", { name: "Check your email" });
    await typeCode("123");
    await userEvent.click(screen.getByRole("button", { name: "Confirm and create account" }));
    expect(await screen.findByText("The code must be exactly 6 digits.")).toBeInTheDocument();
    expect(verifyRegistration).not.toHaveBeenCalled();
  });

  it("shows a wrong code error and clears the boxes", async () => {
    vi.mocked(startRegistration).mockResolvedValue(started);
    vi.mocked(verifyRegistration).mockRejectedValue(new ApiError("That code is incorrect or has expired.", [], 400));
    renderAt(page, "/register");
    await fill("Str0ng!Pass", "Str0ng!Pass");
    await screen.findByRole("heading", { name: "Check your email" });
    await typeCode("000000");
    await userEvent.click(screen.getByRole("button", { name: "Confirm and create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("incorrect or has expired");
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("");
  });

  it("keeps resend disabled during the cooldown", async () => {
    vi.mocked(startRegistration).mockResolvedValue(started);
    renderAt(page, "/register");
    await fill("Str0ng!Pass", "Str0ng!Pass");
    await screen.findByRole("heading", { name: "Check your email" });
    // With exact set to false a string matches part of the text, so the changing seconds do not matter (Testing Library, 2026c).
    expect(screen.getByText("Resend code in", { exact: false })).toBeDisabled();
  });

  it("returns to the form when the user wants a different email", async () => {
    vi.mocked(startRegistration).mockResolvedValue(started);
    renderAt(page, "/register");
    await fill("Str0ng!Pass", "Str0ng!Pass");
    await screen.findByRole("heading", { name: "Check your email" });
    await userEvent.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(await screen.findByRole("heading", { name: "Create your account" })).toBeInTheDocument();
  });
});

// Reference List:
// Testing Library, 2026a. ByLabelText. [online] Available at: <https://testing-library.com/docs/queries/bylabeltext> [Accessed 10 October 2026].
// Testing Library, 2026c. About Queries. [online] Available at: <https://testing-library.com/docs/queries/about/> [Accessed 10 October 2026].
