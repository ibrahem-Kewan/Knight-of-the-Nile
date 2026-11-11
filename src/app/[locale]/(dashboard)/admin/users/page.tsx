import { getLocale, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/config/roles";
import { Link } from "@/lib/i18n/navigation";
import { UserActions } from "@/components/admin/user-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const roleKey: Record<string, string> = {
  super_admin: "roleSuper", admin: "roleAdmin", coach: "roleCoach", judge: "roleJudge", athlete: "roleAthlete",
};
const statusKey: Record<string, string> = {
  pending_approval: "stPending", active: "stActive", suspended: "stSuspended", rejected: "stRejected",
};
const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "secondary"> = {
  pending_approval: "warning", active: "success", suspended: "secondary", rejected: "danger",
};

const PAGE_LIMIT = 200;

type UserRow = {
  id: string;
  display_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
  email: string | null;
  role: Role;
  status: string;
  created_at: string;
  approved_by: string | null;
};

const fullName = (u: { display_name: string | null; first_name_ar: string | null; last_name_ar?: string | null }) =>
  u.display_name?.trim() || `${u.first_name_ar ?? ""} ${u.last_name_ar ?? ""}`.trim() || null;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const me = await requireRole(["super_admin", "admin"]);
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const supabase = await createClient();

  const sp = await searchParams;
  const term = (sp.q ?? "").slice(0, 80).trim();
  const roleFilter = ROLES.includes(sp.role as Role) ? (sp.role as Role) : null;

  // NOTE: no self-embed (profiles -> profiles via approved_by). PostgREST treats that
  // self-relationship as ambiguous and fails the whole query, which made this page
  // show "no users". Approver names are fetched in a second, simple query instead.
  let query = supabase
    .from("profiles")
    .select("id, display_name, first_name_ar, last_name_ar, email, role, status, created_at, approved_by", {
      count: "exact",
    })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(PAGE_LIMIT);

  if (roleFilter) query = query.eq("role", roleFilter);
  if (term) {
    // strip characters that have meaning inside a PostgREST `or=(...)` filter
    const safe = term.replace(/[%,()*\\"']/g, " ").replace(/\s+/g, " ").trim();
    if (safe) {
      const like = `%${safe}%`;
      query = query.or(
        `display_name.ilike.${like},email.ilike.${like},first_name_ar.ilike.${like},last_name_ar.ilike.${like}`,
      );
    }
  }

  const { data, count, error } = await query;
  if (error) console.error("[admin/users] load failed:", error.message);
  const users = (data ?? []) as UserRow[];

  const approverIds = [...new Set(users.map((u) => u.approved_by).filter((v): v is string => !!v))];
  const approvers = new Map<string, string>();
  if (approverIds.length) {
    const { data: rows } = await supabase
      .from("profiles")
      .select("id, display_name, first_name_ar, last_name_ar")
      .in("id", approverIds);
    for (const r of rows ?? []) approvers.set(r.id, fullName(r) ?? "—");
  }

  const viewerIsSuper = me.role === "super_admin";
  const total = count ?? users.length;
  const filtered = Boolean(term || roleFilter);
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-2xl text-gold">{t("manageUsers")}</h1>
        {!error && <p className="text-sm text-muted-foreground">{t("totalUsers", { count: total })}</p>}
      </div>

      {/* Search & filter — plain GET form: works without JS and keeps the URL shareable */}
      <form method="get" role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={term}
            placeholder={t("search")}
            aria-label={t("search")}
            className="h-10 w-full rounded-md border border-border bg-background pe-3 ps-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
        </div>
        <div className="flex gap-2">
          <select
            name="role"
            defaultValue={roleFilter ?? ""}
            aria-label={t("filterRole")}
            className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:flex-none"
          >
            <option value="">{t("allRoles")}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{t(roleKey[r])}</option>
            ))}
          </select>
          <Button type="submit">{t("apply")}</Button>
          {filtered && (
            <Button asChild variant="ghost">
              <Link href="/admin/users">{t("clear")}</Link>
            </Button>
          )}
        </div>
      </form>

      {error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {t("loadError")}
        </p>
      ) : !users.length ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          {filtered ? t("noResults") : t("noUsers")}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {users.map((u) => {
              const name = fullName(u) ?? u.email ?? "—";
              const isSelf = u.id === me.id;
              const approver = u.approved_by ? approvers.get(u.approved_by) : null;
              return (
                <li key={u.id} className="flex flex-col gap-3 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-gold-deep dark:text-gold"
                    >
                      {name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        <span className="break-words">{name}</span>
                        {isSelf && u.role !== "super_admin" && <Badge variant="outline">{t("you")}</Badge>}
                      </p>
                      {u.email && (
                        <p className="truncate text-sm text-muted-foreground">
                          <bdi>{u.email}</bdi>
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                        <Badge variant="secondary">{t(roleKey[u.role] ?? u.role)}</Badge>
                        <Badge variant={statusVariant[u.status] ?? "secondary"}>{t(statusKey[u.status] ?? u.status)}</Badge>
                        <span>
                          {t("joined")}: <time dateTime={u.created_at}>{dateFmt.format(new Date(u.created_at))}</time>
                        </span>
                        {approver && (
                          <span>
                            {t("approvedBy")}: {approver}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="sm:ps-[3.25rem] xl:max-w-[50%] xl:shrink-0 xl:ps-0">
                    <UserActions
                      id={u.id}
                      role={u.role}
                      status={u.status}
                      isSelf={isSelf}
                      viewerIsSuper={viewerIsSuper}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {total > users.length && (
            <p className="text-center text-xs text-muted-foreground">
              {t("showingFirst", { shown: users.length, total })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
