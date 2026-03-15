import { createClient } from "@/lib/supabase/client";
import type { AnalyticsEventType } from "@/types/database";

/**
 * 分析イベントをトラッキング
 * クライアント側から呼び出し、analytics_events テーブルに記録
 */
export async function trackEvent(
  shopId: string,
  eventType: AnalyticsEventType,
  metadata?: Record<string, unknown>
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("analytics_events").insert({
    shop_id: shopId,
    event_type: eventType,
    user_id: user?.id ?? null,
    metadata: metadata ?? null,
  });
}
