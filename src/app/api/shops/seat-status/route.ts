import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  // 認証チェック（anon key）
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: { shopId?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { shopId, status } = body;

  if (!shopId || !status || typeof status !== "string") {
    return NextResponse.json({ error: "パラメータが不足しています" }, { status: 400 });
  }

  const validStatuses = ["available", "busy", "full", "closed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "無効なステータスです" }, { status: 400 });
  }

  // Service role クライアント（RLS バイパス：shops/seat_status 読み取り・更新用）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 店舗のオーナーであることを確認
  const { data: shop } = await serviceSupabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("owner_id", user.id)
    .single();

  if (!shop) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  // まず update を試行（updated_at はカラム存在不明のため status のみ）
  const { data: updated, error: updateError } = await serviceSupabase
    .from("seat_status")
    .update({ status })
    .eq("shop_id", shopId)
    .select("id");

  if (updateError) {
    console.error("seat_status update error:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 行が存在しない場合は insert
  if (!updated || updated.length === 0) {
    const { error: insertError } = await serviceSupabase
      .from("seat_status")
      .insert({ shop_id: shopId, status });

    if (insertError) {
      console.error("seat_status insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
