import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { AnalyticsEventType } from "@/types/database";

const VALID_EVENT_TYPES: AnalyticsEventType[] = [
  "view",
  "click",
  "reserve",
  "favorite",
  "share",
  "instagram_click",
  "post_view",
  "post_impression",
];

export async function POST(request: Request) {
  const supabase = await createClient();

  // 認証は任意（未ログインユーザーでもイベント記録可能）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let body: { shopId?: unknown; eventType?: unknown; metadata?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { shopId, eventType, metadata } = body;

  if (typeof shopId !== "string" || typeof eventType !== "string") {
    return NextResponse.json(
      { error: "パラメータが不足しています" },
      { status: 400 }
    );
  }

  if (!VALID_EVENT_TYPES.includes(eventType as AnalyticsEventType)) {
    return NextResponse.json(
      { error: "無効なイベントタイプです" },
      { status: 400 }
    );
  }

  // Service role クライアント（RLS バイパス：shops 存在確認 + analytics_events 書き込み用）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // shopId が実在するか確認（偽データ注入防止）
  const { data: shop } = await serviceSupabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .maybeSingle();

  if (!shop) {
    return NextResponse.json(
      { error: "無効な店舗IDです" },
      { status: 400 }
    );
  }

  // metadata のサイズ制限（1KB）
  const metadataStr = metadata ? JSON.stringify(metadata) : null;
  if (metadataStr && metadataStr.length > 1024) {
    return NextResponse.json(
      { error: "メタデータが大きすぎます" },
      { status: 400 }
    );
  }

  const { error } = await serviceSupabase.from("analytics_events").insert({
    shop_id: shopId,
    event_type: eventType,
    user_id: user?.id || null,
    metadata: metadata || null,
  });

  if (error) {
    return NextResponse.json(
      { error: "イベントの記録に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
