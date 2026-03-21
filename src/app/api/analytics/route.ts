import { createClient } from "@/lib/supabase/server";
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

  const { shopId, eventType, metadata } = await request.json();

  if (!shopId || !eventType) {
    return NextResponse.json(
      { error: "パラメータが不足しています" },
      { status: 400 }
    );
  }

  if (!VALID_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json(
      { error: "無効なイベントタイプです" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("analytics_events").insert({
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
