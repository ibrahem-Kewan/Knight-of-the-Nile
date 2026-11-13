"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addToGroup } from "@/server/actions/training";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RemoveMemberButton } from "@/components/training/remove-member-button";

export type CardAthlete = { id: string; name: string; email: string | null; phone: string | null };
export type CardMembership = { id: string; groupName: string };
export type CardGroupOption = { id: string; label: string };

export function AthleteGroupCard({
  athlete,
  memberships,
  addable,
}: {
  athlete: CardAthlete;
  memberships: CardMembership[];
  addable: CardGroupOption[];
}) {
  const t = useTranslations("training");
  const c = useTranslations("coach");
  const [pending, start] = useTransition();
  const [groupId, setGroupId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const selectId = `add-group-${athlete.id}`;

  const add = () => {
    if (!groupId) return;
    start(async () => {
      setErr(null);
      const res = await addToGroup(groupId, athlete.id);
      if (res?.ok) setGroupId("");
      else setErr(res?.error ?? "errGeneric");
    });
  };

  return (
    <li className="min-w-0 space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="break-words font-medium">{athlete.name}</p>
        <p className="break-all text-sm text-muted-foreground">{athlete.email ?? "—"}</p>
        {athlete.phone && (
          <p className="text-sm text-muted-foreground">
            {c("phone")}: <span dir="ltr" className="inline-block">{athlete.phone}</span>
          </p>
        )}
      </div>

      <div className="min-w-0 space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">{c("groups")}</p>
        {memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c("noGroupsYet")}</p>
        ) : (
          <ul className="flex flex-wrap items-center gap-2">
            {memberships.map((m) => (
              <li
                key={m.id}
                className="flex min-w-0 max-w-full flex-wrap items-center gap-1 rounded-full border border-border bg-muted/50 ps-3 text-sm"
              >
                <span className="min-w-0 break-words py-1">{m.groupName}</span>
                <RemoveMemberButton membershipId={m.id} label={c("removeFromGroup", { group: m.groupName })} compact />
              </li>
            ))}
          </ul>
        )}
      </div>

      {addable.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1">
            <Label htmlFor={selectId} className="text-xs text-muted-foreground">{c("addToGroup")}</Label>
            <select
              id={selectId}
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              disabled={pending}
              className="h-11 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <option value="">{c("chooseGroup")}</option>
              {addable.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
          <Button type="button" className="min-h-11" disabled={pending || !groupId} onClick={add}>
            {c("addToGroup")}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{c("noGroupToAdd")}</p>
      )}
      {err && <p role="alert" className="text-xs text-danger">{t.has(err) ? t(err) : t("errGeneric")}</p>}
    </li>
  );
}
