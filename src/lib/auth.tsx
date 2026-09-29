import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { demoUsers, demoWorkshop, type AppUser } from "@/lib/taller-data";

// Demo-only session: the real Postgres-backed auth is still being wired up (see
// DEPLOY.md / the persistence plan). This picks one of the seeded accounts and
// remembers it in localStorage so routes can be protected and the UI can branch
// on role, ready to swap for real auth once the backend lands.
const SESSION_KEY = "ferro-taller-session";

type AuthContextValue = {
  user: AppUser | null;
  /**
   * Every seeded account, unfiltered by workshop — the login picker needs the
   * full roster before anyone is signed in, so filtering to the current
   * user's workshop happens at the point of use (e.g. the staff page), not
   * here.
   */
  users: AppUser[];
  /** False until the client has checked localStorage for an existing session. */
  ready: boolean;
  login: (userId: string) => void;
  logout: () => void;
  /** Self-service profile edits and admin staff management both go through this. */
  updateUser: (
    userId: string,
    changes: Partial<Pick<AppUser, "name" | "title" | "role" | "canChangeOrderStatus">>,
  ) => void;
  /** Stamps workshopId from the current session — callers never supply it. */
  addUser: (user: Omit<AppUser, "workshopId">) => void;
  removeUser: (userId: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(demoUsers);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUserId(window.localStorage.getItem(SESSION_KEY));
    setReady(true);
  }, []);

  const user = userId ? (users.find((u) => u.id === userId) ?? null) : null;

  function login(nextUserId: string) {
    const exists = users.some((u) => u.id === nextUserId);
    if (!exists) return;
    setUserId(nextUserId);
    window.localStorage.setItem(SESSION_KEY, nextUserId);
  }

  function logout() {
    setUserId(null);
    window.localStorage.removeItem(SESSION_KEY);
  }

  function updateUser(
    targetId: string,
    changes: Partial<Pick<AppUser, "name" | "title" | "role" | "canChangeOrderStatus">>,
  ) {
    setUsers((current) => current.map((u) => (u.id === targetId ? { ...u, ...changes } : u)));
  }

  function addUser(newUser: Omit<AppUser, "workshopId">) {
    const workshopId = user?.workshopId ?? demoWorkshop.id;
    setUsers((current) => [...current, { ...newUser, workshopId }]);
  }

  function removeUser(targetId: string) {
    setUsers((current) => current.filter((u) => u.id !== targetId));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        ready,
        login,
        logout,
        updateUser,
        addUser,
        removeUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

/**
 * Same as `useAuth`, but also redirects to /login once the session check has
 * finished and there's no user. Route components that bail out with an early
 * `return` before ever rendering <AppShell> (which has its own copy of this
 * effect) must use this instead of `useAuth`, or that redirect never runs and
 * an unauthenticated visit to a protected route just renders a blank page.
 */
export function useRequireAuth(): AuthContextValue {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.ready && !auth.user) navigate({ to: "/login" });
  }, [auth.ready, auth.user, navigate]);

  return auth;
}
