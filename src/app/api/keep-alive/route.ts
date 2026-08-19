import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// لا تُخزَّن النتيجة في الكاش أبداً، وإلا لن تصل الطلبات إلى قاعدة البيانات
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: Request) {
  // حماية اختيارية: لو ضبطت CRON_SECRET في Vercel، يجب إرسالها مع الطلب
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const qs = new URL(request.url).searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && qs !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ ok: false, error: "missing supabase env" }, { status: 500 });
  }

  const startedAt = Date.now();
  try {
    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // استعلام بسيط جداً — يكفي لتسجيل "نشاط" على قاعدة البيانات
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, ms: Date.now() - startedAt },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      pingedAt: new Date().toISOString(),
      ms: Date.now() - startedAt,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown", ms: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
