import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { act, render, screen } from "@testing-library/react";
import { PageChrome } from "./PageChrome.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { titleFor } from "../utils/pageTitle.ts";

describe("titleFor", () => {
  it("gives every main route a readable title", () => {
    expect(titleFor("/dashboard")).toBe("Dashboard | HustleHub+");
    expect(titleFor("/my-gigs/new")).toBe("New gig | HustleHub+");
    expect(titleFor("/my-gigs/507f1f77bcf86cd799439011/edit")).toBe("Edit gig | HustleHub+");
    expect(titleFor("/u/507f1f77bcf86cd799439011")).toBe("Member profile | HustleHub+");
    expect(titleFor("/")).toBe("HustleHub+");
  });
});

describe("PageChrome", () => {
  it("sets the page title from the route", () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <PageChrome />
      </MemoryRouter>,
    );
    expect(document.title).toBe("Your profile | HustleHub+");
  });

  it("shows a banner while offline and hides it when back online", () => {
    render(
      <MemoryRouter>
        <PageChrome />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument();
  });
});

describe("ErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks());

  const Boom = () => {
    throw new Error("secret internal detail");
  };

  it("shows a friendly screen and never leaks the error text", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
  });

  it("renders its children when nothing is wrong", () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });
});
