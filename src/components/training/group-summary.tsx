import { getLocale, getTranslations } from "next-intl/server";
import { CalendarClock, Layers, Wallet } from "lucide-react";
import { formatMoney, formatSchedule } from "@/lib/training/schedule";

export type GroupSummaryData = {
  weekdays: number[];
  start_time: string;
  duration_minutes: number;
  sessions_per_cycle: number;
  monthly_fee: number | string;
  currency: string;
};

/** Schedule / sessions / fee lines shared by the list card and the details header. */
export async function GroupSummary({ g }: { g: GroupSummaryData }) {
  const t = await getTranslations("training");
  const locale = await getLocale();
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-GB");
  return (
    <ul className="min-w-0 space-y-1.5 text-sm text-muted-foreground">
      <li className="flex items-start gap-1.5">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span className="break-words">
          {formatSchedule(g.weekdays, g.start_time, g.duration_minutes, locale)} · {nf.format(g.duration_minutes)} {t("minutes")}
        </span>
      </li>
      <li className="flex items-start gap-1.5">
        <Layers className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{t("sessionsCount", { count: g.sessions_per_cycle })}</span>
      </li>
      <li className="flex items-start gap-1.5">
        <Wallet className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          {formatMoney(g.monthly_fee, g.currency, locale)} <span className="text-xs">{t("perCycle")}</span>
        </span>
      </li>
    </ul>
  );
}
