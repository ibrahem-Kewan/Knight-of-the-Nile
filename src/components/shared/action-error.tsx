"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { errorLabel } from "@/lib/i18n/labels";

type ActionResult = { ok?: boolean; error?: string } | undefined;

/**
 * Runs a server action inside a transition (buttons stay disabled until it finishes)
 * and keeps its error code, so failures are shown instead of silently ignored.
 */
export function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setError(null);
      try {
        const r = await fn();
        if (r?.error) setError(r.error);
      } catch (e) {
        console.error(e);
        setError("generic");
      }
    });
  return { pending, error, run };
}

export function ActionError({ code }: { code: string | null }) {
  const te = useTranslations("errors");
  if (!code) return null;
  return (
    <p role="alert" aria-live="polite" className="w-full break-words text-xs text-danger">
      {errorLabel(te, code)}
    </p>
  );
}
