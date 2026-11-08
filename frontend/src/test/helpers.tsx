import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import type { User, UserRole } from "../models/user.ts";
import { saveSession } from "../services/session.ts";

export const makeUser = (role: UserRole = "client"): User => ({
  _id: "u1",
  username: "Test User",
  email: "t@example.com",
  role,
});

/** Stores a fake logged-in session the same way the login page does. */
export const loginAs = (role: UserRole = "client") => saveSession({ ...makeUser(role), token: "test-token" });

export const renderAt = (ui: ReactElement, route = "/") =>
  render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
