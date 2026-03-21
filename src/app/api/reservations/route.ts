import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";

// 「今すぐ行く」を送信
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { shopId, partySize, note } = await request.json();

  if (!shopId || !partySize) {
    return NextResponse.json(
      { error: "必須パラメータが不足しています" },
      { status: 400 }
    );
  }

  if (typeof partySize !== "number" || partySize < 1 || partySize > 20) {
    return NextResponse.json(
      { error: "人数は1〜20で指定してください" },
      { status: 400 }
    );
  }

  // 既にこの店舗に「向かっています」がある場合は重複防止
  const { data: existing } = await supabase
    .from("reservations")
    .select("id")
    .eq("user_id", user.id)
    .eq("shop_id", shopId)
    .eq("status", "on_the_way")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "既にこのお店に向かっています" },
      { status: 409 }
    );
  }

  const now = new Date();

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      user_id: user.id,
      shop_id: shopId,
      reservation_date: now.toISOString().slice(0, 10),
      reservation_time: now.toTimeString().slice(0, 5),
      party_size: partySize,
      note: note || null,
      status: "on_the_way",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "送信に失敗しました" },
      { status: 500 }
    );
  }

  // 店舗オーナーに来店通知を送信
  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id, name")
    .eq("id", shopId)
    .single();

  if (shop) {
    await createNotification(supabase, {
      userId: shop.owner_id,
      type: "instant_visit",
      title: "新しい来店通知",
      message: `${partySize}名のお客様が向かっています`,
      data: { reservation_id: data.id, shop_id: shopId },
    });
  }

  return NextResponse.json({ success: true, visit: data });
}

// 「今すぐ行く」をキャンセル
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { visitId } = await request.json();

  if (!visitId) {
    return NextResponse.json(
      { error: "IDが必要です" },
      { status: 400 }
    );
  }

  // 自分のデータであることを確認
  const { data: visit } = await supabase
    .from("reservations")
    .select("id, status")
    .eq("id", visitId)
    .eq("user_id", user.id)
    .single();

  if (!visit) {
    return NextResponse.json(
      { error: "データが見つかりません" },
      { status: 404 }
    );
  }

  if (visit.status !== "on_the_way") {
    return NextResponse.json(
      { error: "キャンセルできるのは「向かっています」状態のみです" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", visitId);

  if (error) {
    return NextResponse.json(
      { error: "キャンセルに失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
