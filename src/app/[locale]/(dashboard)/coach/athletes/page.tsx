import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AthleteLinkActions } from "@/components/coach/athlete-link-actions";
import { AthleteGroupCard, type CardAthlete } from "@/components/training/athlete-group-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const selectCls =
  "h-11 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type Branch = { id: string; name_ar: string; name_en: string | null };
type Group = { id: string; branch_id: string; name_ar: string; name_en: string | null; is_active: boolean };
type Membership = { id: string; group_id: string; athlete_id: string };
type AthleteProfile = { id: string; display_name: string | null; email: string | null; phone: string | null };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata() {
  const t = await getTranslations("coach");
  return { title: t("title") };
}

export default async function CoachAthletesPage({ searchParams }: Props) {
  const me = await requireRole(["coach"]);
  const t = await getTranslations("coach");
  const tt = await getTranslations("training");
  const locale = await getLocale();
  const ar = locale === "ar";
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 80);
  const branchId = UUID_RE.test(first(sp.branch)) ? first(sp.branch) : "";
  const groupId = UUID_RE.test(first(sp.group)) ? first(sp.group) : "";
  const unassigned = first(sp.unassigned) === "1";
  const supabase = await createClient();

  const [{ data: pending }, { data: links }, { data: branchRows }, { data: groupRows }] = await Promise.all([
    supabase
      .from("coach_athletes")
      .select("id, athlete_id, profiles!coach_athletes_athlete_id_fkey(display_name, email)")
      .eq("coach_id", me.id)
      .eq("status", "pending"),
    supabase
      .from("coach_athletes")
      .select("athlete_id")
      .eq("coach_id", me.id)
      .eq("is_current", true)
      .eq("status", "active"),
    supabase.from("coach_branches").select("id, name_ar, name_en").eq("coach_id", me.id),
    supabase
      .from("training_groups")
      .select("id, branch_id, name_ar, name_en, is_active")
      .eq("coach_id", me.id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  const branches = (branchRows ?? []) as Branch[];
  const groups = (groupRows ?? []) as Group[];
  const athleteIds = Array.from(new Set((links ?? []).map((l: { athlete_id: string }) => l.athlete_id)));

  const [{ data: profileRows }, { data: memberRows }] = await Promise.all([
    athleteIds.length
      ? supabase.from("profiles").select("id, display_name, email, phone").in("id", athleteIds)
      : Promise.resolve({ data: [] as AthleteProfile[] }),
    athleteIds.length && groups.length
      ? supabase
          .from("training_group_members")
          .select("id, group_id, athlete_id")
          .in("athlete_id", athleteIds)
          .in("group_id", groups.map((g) => g.id))
          .is("left_at", null)
      : Promise.resolve({ data: [] as Membership[] }),
  ]);

  const branchName = (b: Branch) => (ar ? b.name_ar : b.name_en || b.name_ar);
  const groupName = (g: Group) => (ar ? g.name_ar : g.name_en || g.name_ar);
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const branchLabel = (id: string) => (branchById.get(id) ? branchName(branchById.get(id)!) : "—");

  const byAthlete = new Map<string, Membership[]>();
  for (const m of (memberRows ?? []) as Membership[]) {
    byAthlete.set(m.athlete_id, [...(byAthlete.get(m.athlete_id) ?? []), m]);
  }

  const athletes: CardAthlete[] = ((profileRows ?? []) as AthleteProfile[])
    .map((p) => ({ id: p.id, name: p.display_name ?? "—", email: p.email, phone: p.phone }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  const needle = q.toLowerCase();
  const visible = athletes.filter((a) => {
    const ms = byAthlete.get(a.id) ?? [];
    if (needle && !a.name.toLowerCase().includes(needle)) return false;
    if (unassigned && ms.length > 0) return false;
    if (groupId && !ms.some((m) => m.group_id === groupId)) return false;
    if (branchId && !ms.some((m) => groupById.get(m.group_id)?.branch_id === branchId)) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>

      {/* Pending join requests */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("pendingTitle")}</h2>
        {!pending?.length ? (
          <p className="text-sm text-muted-foreground">{t("noPending")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="p-3 text-start">{t("name")}</th>
                <th className="p-3 text-start">{t("email")}</th>
                <th className="p-3 text-start">{t("actions")}</th>
              </tr></thead>
              <tbody>
                {pending.map((l: any) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="p-3 font-medium">{l.profiles?.display_name ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{l.profiles?.email}</td>
                    <td className="p-3"><AthleteLinkActions linkId={l.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Current athletes */}
      <section className="space-y-4" aria-labelledby="current-athletes">
        <h2 id="current-athletes" className="text-sm font-semibold text-muted-foreground">{t("currentTitle")}</h2>
        {!athletes.length ? (
          <p className="text-sm text-muted-foreground">{t("none")}</p>
        ) : (
          <>
            <form method="get" className="grid min-w-0 gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 space-y-1 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="f-q" className="text-xs text-muted-foreground">{t("search")}</Label>
                <Input id="f-q" name="q" defaultValue={q} maxLength={80} className="h-11" />
              </div>
              <div className="min-w-0 space-y-1">
                <Label htmlFor="f-branch" className="text-xs text-muted-foreground">{t("filterBranch")}</Label>
                <select id="f-branch" name="branch" defaultValue={branchId} className={selectCls}>
                  <option value="">{t("allBranches")}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{branchName(b)}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 space-y-1">
                <Label htmlFor="f-group" className="text-xs text-muted-foreground">{t("filterGroup")}</Label>
                <select id="f-group" name="group" defaultValue={groupId} className={selectCls}>
                  <option value="">{t("allGroups")}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{groupName(g)}</option>
                  ))}
                </select>
              </div>
              <label className="flex min-h-11 items-center gap-2 self-end text-sm">
                <input type="checkbox" name="unassigned" value="1" defaultChecked={unassigned} className="h-5 w-5 accent-[hsl(var(--primary))]" />
                {t("unassignedOnly")}
              </label>
              <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
                <Button type="submit" className="min-h-11">{t("apply")}</Button>
                {(q || branchId || groupId || unassigned) && (
                  <Link href="/coach/athletes" className={buttonVariants({ variant: "outline", className: "min-h-11" })}>
                    {t("clear")}
                  </Link>
                )}
              </div>
            </form>

            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t("showing", { shown: visible.length, total: athletes.length })}
            </p>

            {!groups.some((g) => g.is_active) && (
              <p className="text-sm text-muted-foreground">
                {t("noActiveGroups")}{" "}
                <Link href="/coach/groups" className="text-gold-deep underline dark:text-gold">{tt("groupsTitle")}</Link>
              </p>
            )}

            {!visible.length ? (
              <p className="text-sm text-muted-foreground">{t("noMatches")}</p>
            ) : (
              <ul className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((a) => (
                  <AthleteGroupCard
                    key={a.id}
                    athlete={a}
                    memberships={(byAthlete.get(a.id) ?? []).map((m) => ({
                      id: m.id,
                      groupName: groupById.get(m.group_id) ? groupName(groupById.get(m.group_id)!) : "—",
                    }))}
                    addable={groups
                      .filter((g) => g.is_active && !(byAthlete.get(a.id) ?? []).some((m) => m.group_id === g.id))
                      .map((g) => ({ id: g.id, label: `${groupName(g)} - ${branchLabel(g.branch_id)}` }))}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
