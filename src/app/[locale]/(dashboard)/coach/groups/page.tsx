import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GroupForm, type BranchOption, type SportOption } from "@/components/training/group-form";
import { GroupSummary } from "@/components/training/group-summary";

export async function generateMetadata() {
  const t = await getTranslations("training");
  return { title: t("groupsTitle") };
}

type Branch = BranchOption & { is_active: boolean };
type Group = {
  id: string;
  branch_id: string;
  name_ar: string;
  name_en: string | null;
  weekdays: number[];
  start_time: string;
  duration_minutes: number;
  sessions_per_cycle: number;
  monthly_fee: number | string;
  currency: string;
  is_active: boolean;
};

export default async function CoachGroupsPage() {
  const me = await requireRole(["coach"]);
  const t = await getTranslations("training");
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();

  const [{ data: branchRows }, { data: groupRows }, { data: sportRows }] = await Promise.all([
    supabase
      .from("coach_branches")
      .select("id, name_ar, name_en, is_active")
      .eq("coach_id", me.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("training_groups")
      .select("id, branch_id, name_ar, name_en, weekdays, start_time, duration_minutes, sessions_per_cycle, monthly_fee, currency, is_active")
      .eq("coach_id", me.id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("sports").select("id, name_ar, name_en").eq("is_active", true).order("name_ar"),
  ]);

  const branches = (branchRows ?? []) as Branch[];
  const groups = (groupRows ?? []) as Group[];
  const sports = (sportRows ?? []) as SportOption[];
  const activeBranches = branches.filter((b) => b.is_active);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
  const branchName = (b: BranchOption) => (ar ? b.name_ar : b.name_en || b.name_ar);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-gold">{t("groupsTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("groupsIntro")}</p>
      </div>

      {activeBranches.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4 sm:p-6">
          <p className="text-sm text-muted-foreground">{t("needBranchFirst")}</p>
          <Link href="/coach/branches" className={buttonVariants({ className: "min-h-11" })}>
            {t("goToBranches")}
          </Link>
        </div>
      ) : (
        <GroupForm branches={activeBranches} sports={sports} defaultStartsOn={today} />
      )}

      {groups.length === 0 ? (
        activeBranches.length > 0 && <p className="text-sm text-muted-foreground">{t("noGroups")}</p>
      ) : (
        <div className="space-y-8">
          {branches
            .filter((b) => groups.some((g) => g.branch_id === b.id))
            .map((b) => (
              <section key={b.id} className="space-y-3">
                <h2 className="flex flex-wrap items-center gap-2 break-words font-semibold">
                  {branchName(b)}
                  {!b.is_active && <Badge variant="outline">{t("inactive")}</Badge>}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groups
                    .filter((g) => g.branch_id === b.id)
                    .map((g) => (
                      <article key={g.id} className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="min-w-0 break-words font-semibold">{ar ? g.name_ar : g.name_en || g.name_ar}</h3>
                          <Badge variant={g.is_active ? "success" : "outline"}>
                            {g.is_active ? t("active") : t("inactive")}
                          </Badge>
                        </div>
                        <GroupSummary g={g} />
                        <div className="mt-auto pt-1">
                          <Link
                            href={`/coach/groups/${g.id}`}
                            className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-11" })}
                          >
                            {t("viewGroup")}
                          </Link>
                        </div>
                      </article>
                    ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
