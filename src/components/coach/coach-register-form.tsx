"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { coachRegisterAthlete } from "@/server/actions/coach";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

type Athlete = { id: string; name: string };
type Tournament = { id: string; title_ar: string; title_en: string | null; sport_id: string };
type Discipline = { id: string; sport_id: string; name_ar: string; name_en: string };

export function CoachRegisterForm({
  athletes, tournaments, disciplines,
}: { athletes: Athlete[]; tournaments: Tournament[]; disciplines: Discipline[] }) {
  const locale = useLocale();
  const ar = locale === "ar";
  const [athlete, setAthlete] = useState(athletes[0]?.id ?? "");
  const [tournament, setTournament] = useState(tournaments[0]?.id ?? "");
  const sportId = tournaments.find((t) => t.id === tournament)?.sport_id;
  const discList = useMemo(() => disciplines.filter((d) => d.sport_id === sportId), [disciplines, sportId]);
  const [disc, setDisc] = useState(discList[0]?.id ?? "");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (!athletes.length) return <p className="text-muted-foreground">{ar ? "لا يوجد متدربون تابعون لك." : "You have no athletes."}</p>;
  if (!tournaments.length) return <p className="text-muted-foreground">{ar ? "لا توجد بطولات مفتوحة للتسجيل حاليًا." : "No tournaments open for registration."}</p>;

  const sel = "h-10 w-full rounded-md border border-border bg-background px-3 text-sm";

  return (
    <div className="max-w-lg space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="space-y-1.5">
        <label className="text-sm text-muted-foreground">{ar ? "المتدرب" : "Athlete"}</label>
        <select className={sel} value={athlete} onChange={(e) => setAthlete(e.target.value)}>
          {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm text-muted-foreground">{ar ? "البطولة" : "Tournament"}</label>
        <select className={sel} value={tournament} onChange={(e) => { setTournament(e.target.value); setDisc(""); }}>
          {tournaments.map((t) => <option key={t.id} value={t.id}>{ar ? t.title_ar : t.title_en ?? t.title_ar}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm text-muted-foreground">{ar ? "المسار" : "Discipline"}</label>
        <select className={sel} value={disc} onChange={(e) => setDisc(e.target.value)}>
          {discList.map((d) => <option key={d.id} value={d.id}>{ar ? d.name_ar : d.name_en}</option>)}
        </select>
      </div>
      {msg && (
        <p className={`flex items-center gap-2 text-sm ${msg.ok ? "text-success" : "text-danger"}`}>
          {msg.ok && <CheckCircle2 className="h-4 w-4" />}{msg.text}
        </p>
      )}
      <Button
        disabled={pending || !athlete || !tournament || !disc}
        onClick={() =>
          start(async () => {
            const res = await coachRegisterAthlete(athlete, tournament, disc || discList[0]?.id);
            if (res?.ok) setMsg({ ok: true, text: ar ? "تم تسجيل المتدرب." : "Athlete registered." });
            else if (res?.error === "already") setMsg({ text: ar ? "مسجّل بالفعل." : "Already registered." });
            else setMsg({ text: ar ? "تعذّر التسجيل." : "Could not register." });
          })
        }
      >
        {ar ? "تسجيل المتدرب" : "Register athlete"}
      </Button>
    </div>
  );
}
