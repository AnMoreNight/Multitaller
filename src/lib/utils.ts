import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Builds `{ [key]: value }` only when `value` is truthy, otherwise `{}`.
 * tsconfig has `exactOptionalPropertyTypes: true`, so an optional field must be
 * omitted rather than set to `undefined` — this keeps that out of call sites.
 */
export function optional<K extends string, V>(
  key: K,
  value: V | "" | undefined | null,
): { [P in K]?: V } {
  return (value ? { [key]: value } : {}) as { [P in K]?: V };
}

/** Server functions throw plain Errors with a user-facing Spanish message
 * (wrong credentials, permission denied, not found, etc.) — surface that
 * instead of a one-size-fits-all fallback so a failure is actionable.
 * A `.validator()` rejection, by contrast, arrives as a raw JSON-stringified
 * array of zod issues (TanStack Start's default) — pull just the first
 * issue's message out of that instead of dumping the array in a toast. */
export function errorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error) || !err.message) return fallback;
  const zodIssueMessage = firstZodIssueMessage(err.message);
  return zodIssueMessage ?? err.message;
}

function firstZodIssueMessage(message: string): string | null {
  if (!message.startsWith("[")) return null;
  try {
    const issues: unknown = JSON.parse(message);
    if (!Array.isArray(issues)) return null;
    const first = issues[0] as { message?: unknown } | undefined;
    if (typeof first?.message !== "string") return null;
    return first.message === "Invalid email" ? "Correo electrónico inválido." : first.message;
  } catch {
    return null;
  }
}

/**
 * crypto.randomUUID() only exists in a secure context (HTTPS or localhost) —
 * browsers omit it entirely over plain HTTP, which throws `crypto.randomUUID
 * is not a function` the instant any "create X" button runs (every id in the
 * client-side demo data layer is generated this way). Falls back to a
 * Math.random()-based UUID v4 in that case — fine for a client-side row id,
 * never used for anything security-sensitive (real auth tokens are generated
 * server-side in Node, which has no such restriction).
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
