import { useMemo, useSyncExternalStore } from "react";
import type { User } from "../models/user.ts";
import { readAvatar, subscribeProfile } from "../services/profileStore.ts";
import { getUserSnapshot, parseUser, subscribeSession } from "../services/session.ts";
//React (2026) documents subscribing a component to an external store which assisted this implementation.

/** The logged in user, kept in step with the session so the nav bar updates after a profile edit. */
export function useSessionUser(): User | null {
  const raw = useSyncExternalStore(subscribeSession, getUserSnapshot, () => null);
  return useMemo(() => parseUser(raw), [raw]);
}

/** The saved profile photo for a user ("" when there is none). */
export function useAvatar(userId?: string): string {
  return useSyncExternalStore(
    subscribeProfile,
    () => readAvatar(userId),
    () => "",
  );
}

//Reference List
//React, 2026. useSyncExternalStore. [online] Available at: <https://react.dev/reference/react/useSyncExternalStore> [Accessed 11 October 2026].
