import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

// 常に最新の状態を返す（キャッシュしない）
export const dynamic = "force-dynamic";

// 死活監視用エンドポイント。
// Supabaseへ軽いクエリを投げ、DBが応答すれば 200、ダメなら 503 を返す。
// GitHub Actions の keep-alive と外部監視からここを叩くことで、
// 「DBが寝たまま誰も気づかない」状態を防ぐ。
export async function GET() {
  try {
    const supabase = createSupabaseClient();
    const { count, error } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      events: count ?? 0,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
