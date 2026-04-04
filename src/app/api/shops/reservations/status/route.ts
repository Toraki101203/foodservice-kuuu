import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";

// 店舗側：来店通知のステータス更新（到着 / 未来店 / キャンセル）
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: { visitId?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { visitId, status } = body;

  if (!visitId || !status || typeof status !== "string") {
    return NextResponse.json(
      { error: "パラメータが不足しています" },
      { status: 400 }
    );
  }

  const validStatuses = ["arrived", "no_show", "cancelled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: "無効なステータスです" },
      { status: 400 }
    );
  }

  // Service role クライアント（RLS バイパス：shops 読み取り用）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 来店通知を取得（ユーザーIDも取得）
  const { data: visit } = await serviceSupabase
    .from("reservations")
    .select("id, shop_id, user_id")
    .eq("id", visitId)
    .single();

  if (!visit) {
    return NextResponse.json(
      { error: "来店通知が見つかりません" },
      { status: 404 }
    );
  }

  // この店舗のオーナーであることを確認
  const { data: shop } = await serviceSupabase
    .from("shops")
    .select("id, name")
    .eq("id", visit.shop_id)
    .eq("owner_id", user.id)
    .single();

  if (!shop) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { error } = await serviceSupabase
    .from("reservations")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", visitId);

  if (error) {
    return NextResponse.json(
      { error: "ステータスの更新に失敗しました" },
      { status: 500 }
    );
  }

  // ユーザーに到着確認通知を送信
  if (status === "arrived") {
    await createNotification(supabase, {
      userId: visit.user_id,
      type: "visit_arrived",
      title: "到着が確認されました",
      message: `${shop.name}が到着を確認しました`,
      data: { reservation_id: visitId, shop_id: visit.shop_id },
    });
  }

  return NextResponse.json({ success: true });
}
