"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { saveAttendance, type AttendanceInput } from "@/server/actions/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AttendanceMember = {
  athleteId: string;
  name: string;
  status: "present" | "absent" | null;
  score: string;
  performance: number | null;
  note: string;
};

type Row = Omit<AttendanceMember, "athleteId" | "name">;

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const normalizeNumber = (v: string) =>
  v
    .trim()
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[٫,]/g, ".");

const segCls = (on: boolean, tone: "success" | "danger") =>
  `min-h-11 flex-1 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
    on
      ? tone === "success"
        ? "border-success bg-success text-white"
        : "border-danger bg-danger text-white"
      : "border-border bg-background hover:bg-muted"
  }`;

export function AttendanceSheet({ sessionId, members }: { sessionId: string; members: AttendanceMember[] }) {
  const t = useTranslations("training");
  const uid = useId();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(members.map((m) => [m.athleteId, { status: m.status, score: m.score, performance: m.performance, note: m.note }])),
  );
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [missing, setMissing] = useState<Set<string>>(new Set());

  const patch = (id: string, p: Partial<Row>) => {
    setOk(false);
    setMissing((s) => {
      if (!s.has(id)) return s;
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setRows((r) => ({ ...r, [id]: { ...r[id], ...p } }));
  };

  const allPresent = () => {
    setOk(false);
    setRows((r) => Object.fromEntries(Object.entries(r).map(([id, v]) => [id, { ...v, status: "present" as const }])));
  };

  const marked = members.filter((m) => rows[m.athleteId]?.status).length;
  const presentCount = members.filter((m) => rows[m.athleteId]?.status === "present").length;

  const onSave = () => {
    setErr(null);
    setOk(false);
    const incomplete = members.filter((m) => {
      const r = rows[m.athleteId];
      return !r.status && (r.score.trim() !== "" || r.performance !== null || r.note.trim() !== "");
    });
    if (incomplete.length) {
      setMissing(new Set(incomplete.map((m) => m.athleteId)));
      setErr("errChooseStatus");
      return;
    }
    setMissing(new Set());
    const payload: AttendanceInput[] = [];
    for (const m of members) {
      const r = rows[m.athleteId];
      if (!r.status) continue;
      let score: number | null = null;
      const raw = normalizeNumber(r.score);
      if (raw !== "") {
        score = Number(raw);
        if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(score)) {
          setErr("errScore");
          return;
        }
      }
      payload.push({ athleteId: m.athleteId, status: r.status, score, performance: r.performance, note: r.note });
    }
    if (!payload.length) return;
    start(async () => {
      const res = await saveAttendance(sessionId, payload);
      if (res?.ok) setOk(true);
      else setErr(res?.error && t.has(res.error) ? res.error : "errGeneric");
    });
  };

  return (
    <div className="min-w-0 space-y-3 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("presentCount", { present: presentCount, total: members.length })}
        </p>
        <Button type="button" variant="outline" className="min-h-11" onClick={allPresent} disabled={pending}>
          {t("allPresent")}
        </Button>
      </div>

      <ul className="grid min-w-0 gap-3 md:grid-cols-2">
        {members.map((m) => {
          const r = rows[m.athleteId];
          const id = `${uid}-${m.athleteId}`;
          return (
            <li key={m.athleteId} className={`min-w-0 space-y-3 rounded-lg border bg-card p-3 sm:p-4 ${missing.has(m.athleteId) ? "border-danger ring-1 ring-danger" : "border-border"}`}>
              <p className="break-words font-medium">{m.name}</p>
              <div className="flex gap-2" role="group" aria-label={m.name}>
                <button type="button" aria-pressed={r.status === "present"} className={segCls(r.status === "present", "success")} onClick={() => patch(m.athleteId, { status: "present" })} disabled={pending}>
                  {t("present")}
                </button>
                <button type="button" aria-pressed={r.status === "absent"} className={segCls(r.status === "absent", "danger")} onClick={() => patch(m.athleteId, { status: "absent" })} disabled={pending}>
                  {t("absent")}
                </button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-score`}>{t("score")}</Label>
                <Input id={`${id}-score`} inputMode="decimal" dir="ltr" className="h-11 text-start" value={r.score} onChange={(e) => patch(m.athleteId, { score: e.target.value })} disabled={pending} />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium leading-none">{t("performance")}</p>
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t("performance")}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const on = (r.performance ?? 0) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={r.performance === n}
                        aria-label={t("starsLabel", { n })}
                        onClick={() => patch(m.athleteId, { performance: r.performance === n ? null : n })}
                        disabled={pending}
                        className="flex h-11 w-11 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                      >
                        <Star className={`h-6 w-6 ${on ? "fill-gold text-gold" : "text-muted-foreground"}`} aria-hidden />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-note`}>{t("note")}</Label>
                <Input id={`${id}-note`} maxLength={300} className="h-11" value={r.note} onChange={(e) => patch(m.athleteId, { note: e.target.value })} disabled={pending} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 z-10 -mx-1 space-y-2 border-t border-border bg-background/95 p-3 backdrop-blur">
        {err && (
          <p role="alert" className="text-sm text-danger">
            {t.has(err) ? t(err) : t("errGeneric")}
          </p>
        )}
        {ok && (
          <p role="status" className="text-sm font-medium text-success">
            {t("attendanceSaved")}
          </p>
        )}
        <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={onSave} disabled={pending || !marked}>
          {t("saveAttendance")}
        </Button>
      </div>
    </div>
  );
}
