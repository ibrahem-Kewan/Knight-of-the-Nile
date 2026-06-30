"use client";

import { useTransition } from "react";
import { moderatePost } from "@/server/actions/content";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function PostModerate({ id, ar }: { id: string; ar: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(() => { void moderatePost(id, "publish"); })}>
        <Check className="h-3.5 w-3.5" /> {ar ? "نشر" : "Publish"}
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(() => { void moderatePost(id, "reject"); })}>
        <X className="h-3.5 w-3.5" /> {ar ? "رفض" : "Reject"}
      </Button>
    </div>
  );
}
