import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GigEditorPage } from "./GigEditorPage.tsx";
import { createGig } from "../services/marketApi.ts";
import { ToastProvider } from "../components/ToastProvider.tsx";
import { loginAs, renderAt } from "../test/helpers.tsx";

vi.mock("../services/marketApi.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/marketApi.ts")>()),
  createGig: vi.fn(),
}));

const page = (
  <ToastProvider>
    <Routes>
      <Route path='/my-gigs/new' element={<GigEditorPage />} />
      <Route path='/my-gigs' element={<p>my gigs page</p>} />
      <Route path='/my-gigs/:id/edit' element={<GigEditorPage />} />
    </Routes>
  </ToastProvider>
);

describe("gig form input rules", () => {
  beforeEach(() => {
    loginAs("freelancer");
    vi.mocked(createGig).mockReset();
  });

  it("only accepts digits in the number fields", async () => {
    renderAt(page, "/my-gigs/new");
    const price = await screen.findByLabelText("Price (R)");
    const days = screen.getByLabelText("Delivery (days)");
    await userEvent.type(price, "12ab5.999");
    await userEvent.type(days, "7x9z");
    expect(price).toHaveValue("125.99");
    expect(days).toHaveValue("79");
  });

  it("blocks markup characters from being typed or pasted", async () => {
    renderAt(page, "/my-gigs/new");
    const title = await screen.findByLabelText("Gig title");
    fireEvent.change(title, { target: { value: "Logo <script>alert(1)</script> design" } });
    expect((title as HTMLInputElement).value).not.toMatch(/[<>]/);
  });

  it("shows regex validation errors and does not submit invalid data", async () => {
    renderAt(page, "/my-gigs/new");
    await userEvent.type(await screen.findByLabelText("Gig title"), "Hi");
    await userEvent.click(screen.getByRole("button", { name: /Publish gig/ }));
    expect(await screen.findByText(/Title must be 5 to 100 characters/)).toBeInTheDocument();
    expect(screen.getByText(/Enter a price between/)).toBeInTheDocument();
    expect(createGig).not.toHaveBeenCalled();
  });

  it("sends sanitised values for a valid gig", async () => {
    vi.mocked(createGig).mockResolvedValue({} as never);
    renderAt(page, "/my-gigs/new");
    await userEvent.type(await screen.findByLabelText("Gig title"), "  Brand   identity kit  ");
    await userEvent.type(
      screen.getByLabelText("Description"),
      "A full logo, palette and type system for your business.",
    );
    await userEvent.type(screen.getByLabelText("Price (R)"), "2500");
    await userEvent.type(screen.getByLabelText("Delivery (days)"), "5");
    await userEvent.click(screen.getByRole("button", { name: /Publish gig/ }));
    await waitFor(() =>
      expect(createGig).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Brand identity kit", price: 2500, deliveryTimeDays: 5, status: "active" }),
      ),
    );
  });

  it("denies an invalid id in the edit URL without calling the API", () => {
    renderAt(page, "/my-gigs/%24ne/edit");
    expect(screen.getByText(/isn't available for your account/i)).toBeInTheDocument();
  });
});
