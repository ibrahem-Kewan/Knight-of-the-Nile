"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { resendConfirmation } from "@/server/actions/email-confirmation";

/** "Send the confirmation e-mail again" button; `getEmail` reads the address when clicked. */
export function ResendConfirmation({ getEmail }: { getEmail: () => string }) {
  const t = useTranslations("auth");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok?: true; error?: string }>();

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setResult((await resendConfirmation(getEmail())) ?? undefined);
          })
        }
      >
        {t("resendConfirmation")}
      </Button>
      {result?.ok && (
        <p role="status" className="text-sm text-success">
          {t("confirmationResent")}
        </p>
      )}
      {result?.error && (
        <p role="alert" className="text-sm text-danger">
          {t.has(result.error) ? t(result.error as never) : t("errResendFailed")}
        </p>
      )}
    </div>
  );
}
