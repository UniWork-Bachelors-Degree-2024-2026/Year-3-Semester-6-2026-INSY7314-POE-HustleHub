import type { AuthResponse, User } from "../models/user.ts";

// sessionStorage clears when the tab closes, so the token does not linger like it would in localStorage
const TOKEN_KEY = "hh_token";
const USER_KEY = "hh_user";
const SESSION_EVENT = "hh:session";

export function saveSession({ token, ...user }: AuthResponse) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function parseUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getUser(): User | null {
  return parseUser(sessionStorage.getItem(USER_KEY));
}

// Used by useSessionUser so components re-render when the stored user changes
export const getUserSnapshot = (): string | null => sessionStorage.getItem(USER_KEY);

export function subscribeSession(callback: () => void): () => void {
  window.addEventListener(SESSION_EVENT, callback);
  return () => window.removeEventListener(SESSION_EVENT, callback);
}

/** Updates the saved user after a successful profile edit (the token is left alone). */
export function updateSessionUser(patch: Partial<Pick<User, "username" | "email">>): User | null {
  const current = getUser();
  if (!current) return null;
  const next = { ...current, ...patch };
  sessionStorage.setItem(USER_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(SESSION_EVENT));
  return next;
}

/** Stores a fresh token after a password change, so this device stays signed in while others are signed out. */
export function replaceToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}
