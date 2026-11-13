import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink, MapPin } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { BranchForm, type BranchValues, type Governorate } from "@/components/training/branch-form";
import { BranchActiveToggle } from "@/components/training/branch-active-toggle";

export async function generateMetadata() {
  const t = await getTranslations("training");
  return { title: t("branchesTitle") };
}

type Branch = BranchValues & { is_active: boolean };

export default async function CoachBranchesPage() {
  const me = await requireRole(["coach"]);
  const t = await getTranslations("training");
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();

  const [{ data: branchRows }, { data: govRows }] = await Promise.all([
    supabase
      .from("coach_branches")
      .select("id, name_ar, name_en, governorate_id, city, address, map_url, is_active")
      .eq("coach_id", me.id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("governorates").select("id, name_ar, name_en, is_active").order("name_ar"),
  ]);

  const branches = (branchRows ?? []) as Branch[];
  const allGovs = (govRows ?? []) as (Governorate & { is_active: boolean })[];
  const govName = new Map(allGovs.map((g) => [g.id, ar ? g.name_ar : g.name_en]));
  const activeGovs: Governorate[] = allGovs.filter((g) => g.is_active);
  // Options for a branch: active ones plus its current one even if inactive (never silently drop it).
  const govOptionsFor = (current: string | null): Governorate[] =>
    current && !activeGovs.some((g) => g.id === current)
      ? [...activeGovs, ...allGovs.filter((g) => g.id === current)]
      : activeGovs;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-gold">{t("branchesTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("branchesIntro")}</p>
      </div>

      <BranchForm governorates={activeGovs} />

      {branches.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noBranches")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((b) => {
            const name = ar ? b.name_ar : (b.name_en || b.name_ar);
            return (
              <article key={b.id} className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="min-w-0 break-words font-semibold">{name}</h2>
                  <Badge variant={b.is_active ? "success" : "outline"}>
                    {b.is_active ? t("active") : t("inactive")}
                  </Badge>
                </div>
                <div className="min-w-0 space-y-1 text-sm text-muted-foreground">
                  {b.governorate_id && govName.get(b.governorate_id) && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="break-words">
                        {govName.get(b.governorate_id)}
                        {b.city ? ` — ${b.city}` : ""}
                      </span>
                    </p>
                  )}
                  {b.address && <p className="break-words">{b.address}</p>}
                  {b.map_url && (
                    <a
                      href={b.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 text-gold-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-gold"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden /> {t("openMap")}
                    </a>
                  )}
                </div>
                <div className="mt-auto flex flex-wrap items-start gap-2 pt-1">
                  <BranchActiveToggle id={b.id} active={b.is_active} />
                  <BranchForm governorates={govOptionsFor(b.governorate_id)} branch={b} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
