import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "@/types/database";

/**
 * 通知レコードを作成（サーバーサイド専用）
 *
 * 必要な RLS ポリシー:
 * CREATE POLICY "notifications_insert_authenticated" ON notifications
 *   FOR INSERT TO authenticated WITH CHECK (true);
 */
export async function createNotification(
  supabase: SupabaseClient,
  params: {
    userId: string;
    type: NotificationType;
    title: string;
    message?: string;
    data?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    data: params.data ?? null,
  });

  if (error) {
    // 通知の作成失敗はメインフローをブロックしない
    console.error("[notifications] INSERT failed:", error.message);
  }
}
