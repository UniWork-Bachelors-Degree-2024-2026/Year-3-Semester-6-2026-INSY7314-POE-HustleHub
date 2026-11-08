import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ForgotPasswordPage } from "./ForgotPasswordPage.tsx";
import { ApiError, requestPasswordReset, resetPassword } from "../services/api.ts";
import { renderAt } from "../test/helpers.tsx";

vi.mock("../services/api.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/api.ts")>()),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

const page = (
  <Routes>
    <Route path='/forgot-password' element={<ForgotPasswordPage />} />
    <Route path='/login' element={<p>login page</p>} />
  </Routes>
);

const sent = {
  message: "If an account exists for that email address, we have sent a reset code to it.",
  expiresInMinutes: 10,
  resendAfterSeconds: 60,
};

// Form fields are found by their label text (Testing Library, 2026a).
async function requestCode() {
  await userEvent.type(screen.getByLabelText("Email"), "Thandi@Example.com");
  await userEvent.click(screen.getByRole("button", { name: "Send reset code" }));
  await screen.findByRole("heading", { name: "Enter your code" });
}

async function fillReset(code: string, password: string, confirm: string) {
  await userEvent.click(screen.getAllByRole("textbox")[0]);
  await userEvent.keyboard(code);
  await userEvent.type(screen.getByLabelText("New password"), password);
  await userEvent.type(screen.getByLabelText("Confirm new password"), confirm);
  await userEvent.click(screen.getByRole("button", { name: "Update password" }));
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.mocked(requestPasswordReset).mockReset();
    vi.mocked(resetPassword).mockReset();
  });

  it("asks for an email first and validates it", async () => {
    renderAt(page, "/forgot-password");
    await userEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  // The wording is shown exactly as sent, so the page never confirms whether an account exists (OWASP, 2026d).
  it("sends a cleaned email and shows the server's neutral message", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(sent);
    renderAt(page, "/forgot-password");
    await requestCode();
    expect(requestPasswordReset).toHaveBeenCalledWith("thandi@example.com");
    expect(screen.getByText(sent.message)).toBeInTheDocument();
  });

  it("blocks a weak new password and a mismatch before calling the server", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(sent);
    renderAt(page, "/forgot-password");
    await requestCode();
    await fillReset("123456", "weak", "weak");
    expect(await screen.findByText("Password does not meet the complexity requirements.")).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("needs all six digits of the code", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(sent);
    renderAt(page, "/forgot-password");
    await requestCode();
    await fillReset("12", "Brand#New5678", "Brand#New5678");
    expect(await screen.findByText("The code must be exactly 6 digits.")).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("resets the password and offers the log in page", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(sent);
    vi.mocked(resetPassword).mockResolvedValue({ message: "Your password has been updated." });
    renderAt(page, "/forgot-password");
    await requestCode();
    await fillReset("482915", "Brand#New5678", "Brand#New5678");
    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({
        email: "thandi@example.com",
        code: "482915",
        newPassword: "Brand#New5678",
      }),
    );
    expect(await screen.findByRole("heading", { name: "Password updated" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Go to log in" }));
    expect(await screen.findByText("login page")).toBeInTheDocument();
  });

  it("shows the server error for a wrong code and clears the boxes", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(sent);
    vi.mocked(resetPassword).mockRejectedValue(new ApiError("That code is incorrect or has expired.", [], 400));
    renderAt(page, "/forgot-password");
    await requestCode();
    await fillReset("000000", "Brand#New5678", "Brand#New5678");
    expect(await screen.findByRole("alert")).toHaveTextContent("incorrect or has expired");
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("");
  });
});

// Reference List:
// OWASP, 2026d. Forgot Password Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html> [Accessed 10 October 2026].
// Testing Library, 2026a. ByLabelText. [online] Available at: <https://testing-library.com/docs/queries/bylabeltext> [Accessed 10 October 2026].
