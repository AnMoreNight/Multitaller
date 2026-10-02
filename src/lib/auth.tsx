import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { createContext, useContext, type ReactNode } from "react";
import { useEffect } from "react";

import {
  changeOwnPassword,
  getSession,
  login as loginFn,
  logout as logoutFn,
} from "@/lib/server/auth.functions";
import {
  createUser,
  listUsers,
  removeUser as removeUserFn,
  updateUser as updateUserFn,
} from "@/lib/server/users.functions";
import type { AppUser, Role } from "@/lib/taller-data";

// A workshop admin can only ever create or promote to admin/worker — system_admin
// is platform-level and only ever created via the seed script.
export type WorkshopRole = Exclude<Role, "system_admin">;

type UserChanges = Partial<{
  name: string;
  title: string;
  role: WorkshopRole;
  canChangeOrderStatus: boolean;
}>;

type NewUserInput = {
  name: string;
  title: string;
  role: WorkshopRole;
  canChangeOrderStatus: boolean;
  email: string;
  password: string;
};

type AuthContextValue = {
  user: AppUser | null;
  /** Every user in the caller's own workshop — empty until signed in (system_admin has none, by design). */
  users: AppUser[];
  /** False until the initial session check (a real network round-trip now) has resolved. */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Self-service profile edits and admin staff management both go through this. */
  updateUser: (userId: string, changes: UserChanges) => Promise<void>;
  addUser: (user: NewUserInput) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  /** Re-verifies currentPassword server-side; signs the user out of every session on success. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({ queryKey: ["session"], queryFn: () => getSession() });
  const user = sessionQuery.data?.user ?? null;
  const ready = !sessionQuery.isPending;
  const workshopId = user?.workshopId;

  const usersQuery = useQuery({
    queryKey: ["workshop", workshopId, "users"],
    queryFn: () => listUsers(),
    enabled: Boolean(workshopId),
  });
  const users = usersQuery.data ?? [];

  const usersKey = ["workshop", workshopId, "users"];

  const loginMutation = useMutation({
    mutationFn: (input: { email: string; password: string }) => loginFn({ data: input }),
    // Set the result directly instead of invalidating — invalidate only
    // schedules a refetch, so the caller's immediate navigate({to: "/"})
    // would land on a route whose useRequireAuth() still sees the stale
    // pre-login `user: null` and bounces back to /login until that refetch
    // resolves. The login response already has the authenticated user, so
    // there's nothing to refetch.
    onSuccess: (result) => queryClient.setQueryData(["session"], result),
  });

  const logoutMutation = useMutation({
    mutationFn: () => logoutFn(),
    // Never let the next person to sign in on this device see a flash of the
    // previous tenant's cached data.
    onSuccess: () => queryClient.clear(),
  });

  const createUserMutation = useMutation({
    mutationFn: (input: NewUserInput) => createUser({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  });

  const updateUserMutation = useMutation({
    mutationFn: (input: { userId: string; changes: UserChanges }) => updateUserFn({ data: input }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: usersKey });
      if (updated.id === user?.id) queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (userId: string) => removeUserFn({ data: { userId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      changeOwnPassword({ data: input }),
    // The server already revoked every session (including this one) and
    // cleared the cookie — drop the cached session everywhere so useAuth()
    // reflects "signed out" immediately instead of waiting for a stale
    // getSession() to be refetched.
    onSuccess: () => queryClient.clear(),
  });

  async function login(email: string, password: string) {
    await loginMutation.mutateAsync({ email, password });
  }
  async function logout() {
    await logoutMutation.mutateAsync();
  }
  async function updateUser(userId: string, changes: UserChanges) {
    await updateUserMutation.mutateAsync({ userId, changes });
  }
  async function addUser(newUser: NewUserInput) {
    await createUserMutation.mutateAsync(newUser);
  }
  async function removeUser(userId: string) {
    await removeUserMutation.mutateAsync(userId);
  }
  async function changePassword(currentPassword: string, newPassword: string) {
    await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
  }

  return (
    <AuthContext.Provider
      value={{ user, users, ready, login, logout, updateUser, addUser, removeUser, changePassword }}
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
 * Same as `useAuth`, but also redirects once the session check has resolved:
 * to /login with no session, or to /system/workshops for a system_admin, who
 * has no workshop dashboard to see. Route components that bail out with an
 * early `return` before ever rendering <AppShell> must use this instead of
 * `useAuth`, or the redirect never runs.
 */
export function useRequireAuth(): AuthContextValue {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.user) navigate({ to: "/login" });
    else if (auth.user.role === "system_admin") navigate({ to: "/system/workshops" });
  }, [auth.ready, auth.user, navigate]);

  return auth;
}

/** The guard for /system/workshops itself — deliberately separate from useRequireAuth,
 * which would otherwise redirect a system_admin straight back to this same page. */
export function useRequireSystemAdmin(): AuthContextValue {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.user) navigate({ to: "/login" });
    else if (auth.user.role !== "system_admin") navigate({ to: "/" });
  }, [auth.ready, auth.user, navigate]);

  return auth;
}
