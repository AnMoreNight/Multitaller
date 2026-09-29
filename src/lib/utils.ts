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
