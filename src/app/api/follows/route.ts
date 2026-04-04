import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: { shopId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { shopId } = body;

  if (!shopId) {
    return NextResponse.json(
      { error: "店舗IDが必要です" },
      { status: 400 }
    );
  }

  // 重複チェック
  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("user_id", user.id)
    .eq("shop_id", shopId)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "既にフォロー済みです" },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("follows")
    .insert({ user_id: user.id, shop_id: shopId });

  if (error) {
    return NextResponse.json(
      { error: "フォローに失敗しました" },
      { status: 500 }
    );
  }

  // Service role クライアント（RLS バイパス：shops 読み取り用）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 店舗オーナーにフォロー通知を送信
  const [{ data: shop }, { data: profile }] = await Promise.all([
    serviceSupabase.from("shops").select("owner_id, name").eq("id", shopId).single(),
    serviceSupabase.from("profiles").select("display_name").eq("id", user.id).single(),
  ]);

  if (shop) {
    const displayName = profile?.display_name ?? "ユーザー";
    await createNotification(supabase, {
      userId: shop.owner_id,
      type: "follow",
      title: "新しいフォロワー",
      message: `${displayName}さんがお店をフォローしました`,
      data: { shop_id: shopId, follower_user_id: user.id },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: { shopId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { shopId } = body;

  if (!shopId) {
    return NextResponse.json(
      { error: "店舗IDが必要です" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("user_id", user.id)
    .eq("shop_id", shopId);

  if (error) {
    return NextResponse.json(
      { error: "フォロー解除に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
