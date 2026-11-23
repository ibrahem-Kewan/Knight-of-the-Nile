import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { ProfileForm, type ProfileInitial } from "@/components/profile/profile-form";
import { PasswordForm } from "@/components/profile/password-form";
import { RegistrationTypeSection } from "@/components/profile/registration-type-section";
import { RoleUpgradeCard } from "@/components/profile/role-upgrade-card";
import { StaffSpecialtiesCard } from "@/components/profile/staff-specialties-card";
import { isStaffRole, sortSpecialties } from "@/lib/staff/specialties";
import { hasProfileName } from "@/lib/profile/name";

export default async function ProfilePage() {
  const me = await requireAuth();
  const t = await getTranslations("profile");
  const supabase = await createClient();

  const [{ data }, { data: pendingReq }, { data: specRows, error: specErr }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "first_name_ar, last_name_ar, first_name_en, last_name_en, display_name, phone, email, avatar_url, bio, social",
      )
      .eq("id", me.id)
      .single(),
    supabase
      .from("role_requests")
      .select("requested_role")
      .eq("profile_id", me.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle(),
    isStaffRole(me.role)
      ? supabase.from("staff_specialties").select("specialty").eq("profile_id", me.id).eq("role", me.role)
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (specErr) console.error("[profile] specialties load failed:", specErr.code, specErr.message);

  const initial = (data ?? {}) as ProfileInitial;
  const pendingRole = (pendingReq as { requested_role: string } | null)?.requested_role ?? null;
  const canUpgrade = me.role === "athlete" || me.role === "coach";

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{initial.display_name ?? me.email}</p>
      </div>

      {!hasProfileName(initial) && (
        <div role="alert" className="mb-6 rounded-lg border border-gold/50 bg-gold/10 p-4">
          <p className="font-semibold text-gold">{t("nameRequiredTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("nameRequiredNote")}</p>
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-6">
          <AvatarUploader
            url={initial.avatar_url ?? null}
            fallback={(initial.display_name ?? me.email ?? "?").slice(0, 1).toUpperCase()}
          />
        </section>
        {isStaffRole(me.role) && (
          <StaffSpecialtiesCard
            role={me.role}
            specialties={sortSpecialties(((specRows ?? []) as { specialty: string }[]).map((r) => r.specialty))}
          />
        )}
        <ProfileForm initial={initial} />
        {me.role === "athlete" && <RegistrationTypeSection athleteId={me.id} />}
        {canUpgrade && (
          <RoleUpgradeCard currentRole={me.role as "athlete" | "coach"} pendingRole={pendingRole} />
        )}
        <PasswordForm />
      </div>
    </div>
  );
}
