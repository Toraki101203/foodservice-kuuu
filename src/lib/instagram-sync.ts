import type { Shop } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 店舗の Instagram 投稿を同期
 * Instagram Graph API から最新投稿を取得し、instagram_posts テーブルに upsert
 */
export async function syncShopPosts(supabase: SupabaseClient, shop: Shop) {
  if (!shop.instagram_access_token || !shop.instagram_user_id) {
    return { success: false, error: "Instagram未連携" };
  }

  // トークン有効期限チェック
  if (
    shop.instagram_token_expires_at &&
    new Date(shop.instagram_token_expires_at) < new Date()
  ) {
    return { success: false, error: "トークン期限切れ" };
  }

  const url = `https://graph.instagram.com/v21.0/${shop.instagram_user_id}/media?fields=id,caption,media_url,permalink,timestamp,media_type&access_token=${shop.instagram_access_token}&limit=20`;

  const res = await fetch(url);
  if (!res.ok) {
    return { success: false, error: "Instagram APIエラー" };
  }

  const data = await res.json();
  const posts = (data.data ?? []).filter(
    (p: { media_type: string }) =>
      p.media_type === "IMAGE" ||
      p.media_type === "CAROUSEL_ALBUM" ||
      p.media_type === "VIDEO"
  );

  // バッチ upsert（N+1 回避）
  const now = new Date().toISOString();
  const records = posts.map((post: { id: string; media_url: string; caption?: string; permalink: string; timestamp: string }) => ({
    shop_id: shop.id,
    instagram_post_id: post.id,
    image_url: post.media_url,
    caption: post.caption ?? null,
    permalink: post.permalink,
    posted_at: post.timestamp,
    fetched_at: now,
  }));

  const { error } = await supabase
    .from("instagram_posts")
    .upsert(records, { onConflict: "shop_id,instagram_post_id" });
  const synced = error ? 0 : records.length;

  // 最終同期日時を更新
  await supabase
    .from("shops")
    .update({ instagram_synced_at: new Date().toISOString() })
    .eq("id", shop.id);

  return { success: true, synced };
}
