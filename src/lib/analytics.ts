import type { AnalyticsEventType } from "@/types/database";

/**
 * 分析イベントをトラッキング
 * サーバー API 経由で analytics_events テーブルに記録
 */
export async function trackEvent(
  shopId: string,
  eventType: AnalyticsEventType,
  metadata?: Record<string, unknown>
) {
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shopId, eventType, metadata }),
  }).catch(() => {
    // 分析イベントの送信失敗は無視
  });
}
