import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { RoleRequestForm } from "@/components/athlete/role-request-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function RequestRolePage() {
  const me = await requireRole(["athlete"]);
  const t = await getTranslations("roleReq");
  const supabase = await createClient();

  const { data: pendingReq } = await supabase
    .from("role_requests")
    .select("requested_role, status")
    .eq("profile_id", me.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  const reqRole = (pendingReq as { requested_role: string } | null)?.requested_role;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("sub")}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {reqRole ? (
            <Badge variant="warning">
              {t("pending")}
              {reqRole === "coach" ? t("asCoach") : t("asJudge")}
            </Badge>
          ) : (
            <RoleRequestForm />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
