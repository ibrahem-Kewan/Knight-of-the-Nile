"use client";

import { useTransition } from "react";
import { approveUser, rejectUser } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function ApprovalActions({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => start(() => { void approveUser(userId); })}
      >
        <Check className="h-4 w-4" /> اعتماد
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => start(() => { void rejectUser(userId); })}
      >
        <X className="h-4 w-4" /> رفض
      </Button>
    </div>
  );
}
