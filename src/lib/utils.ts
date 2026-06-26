import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Return localized value from {ar,en} or paired fields, with fallback. */
export function localized(
  value: { ar?: string | null; en?: string | null } | null | undefined,
  locale: string,
): string {
  if (!value) return "";
  return (locale === "ar" ? value.ar : value.en) || value.ar || value.en || "";
}
