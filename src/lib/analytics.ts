import { createClient } from "@/lib/supabase/client";
import type { AnalyticsEventType } from "@/types/database";

/**
 * 分析イベントを送信するヘルパー
 * 店舗ページの閲覧・クリック・予約・お気に入り等のイベントを記録する
 */
export async function trackEvent(
  restaurantId: string,
  eventType: AnalyticsEventType,
  metadata?: Record<string, unknown>
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("analytics_events").insert({
    restaurant_id: restaurantId,
    event_type: eventType,
    user_id: user?.id ?? null,
    metadata: metadata ?? {},
  });
}
