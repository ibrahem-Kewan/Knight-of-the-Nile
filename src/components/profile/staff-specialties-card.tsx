import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { enumLabel } from "@/lib/i18n/labels";
import { specialtyGroup, type StaffRole, type StaffSpecialty } from "@/lib/staff/specialties";

/** Read-only specialties of the signed-in coach/judge (PR-18). Only an admin can change them. */
export async function StaffSpecialtiesCard({ role, specialties }: { role: StaffRole; specialties: StaffSpecialty[] }) {
  const t = await getTranslations("profile");
  const te = await getTranslations("enums");
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="font-semibold">{t("specialtiesTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("specialtiesHint")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {specialties.length ? (
          specialties.map((s) => <Badge key={s}>{enumLabel(te, specialtyGroup(role), s)}</Badge>)
        ) : (
          <span className="text-sm text-muted-foreground">{t("noSpecialties")}</span>
        )}
      </div>
    </section>
  );
}
