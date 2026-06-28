"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";

type Res = { ok?: boolean; error?: string };

function slugify(s: string) {
  const base = s.toLowerCase().trim().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "");
  return (base || "tournament") + "-" + Math.random().toString(36).slice(2, 6);
}

export async function createTournament(formData: FormData): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();

  const titleAr = String(formData.get("title_ar") || "").trim();
  const titleEn = String(formData.get("title_en") || "").trim();
  const sportId = String(formData.get("sport_id") || "");
  if (!titleAr || !sportId) return { error: "missing" };

  const num = (k: string) => {
    const v = formData.get(k);
    return v ? Number(v) : null;
  };
  const str = (k: string) => {
    const v = String(formData.get(k) || "").trim();
    return v || null;
  };

  const { error } = await supabase.from("tournaments").insert({
    title_ar: titleAr,
    title_en: titleEn || null,
    slug: slugify(titleEn || titleAr),
    sport_id: sportId,
    scope: str("scope") || "local",
    venue: str("venue"),
    start_date: str("start_date"),
    end_date: str("end_date"),
    registration_end: str("registration_end"),
    max_participants: num("max_participants"),
    fees: num("fees") ?? 0,
    status: "draft",
    created_by: me.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/tournaments");
  return { ok: true };
}

export async function setTournamentStatus(id: string, status: string): Promise<Res> {
  await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  await supabase.from("tournaments").update({ status }).eq("id", id);
  revalidatePath("/admin/tournaments");
  revalidatePath("/tournaments");
  return { ok: true };
}

export async function assignJudge(tournamentId: string, judgeId: string): Promise<Res> {
  await requireRole(["super_admin", "admin"]);
  if (!judgeId) return { error: "no-judge" };
  const supabase = await createClient();
  await supabase
    .from("tournament_staff")
    .insert({ tournament_id: tournamentId, profile_id: judgeId, role_in_tournament: "judge" });
  revalidatePath("/admin/tournaments");
  return { ok: true };
}
