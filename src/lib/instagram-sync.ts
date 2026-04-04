import type { Shop } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 店舗の Instagram 投稿を同期
 * Instagram Graph API から最新投稿を取得し、instagram_posts テーブルに upsert
 */
export async function syncShopPosts(supabase: SupabaseClient, shop: Shop) {
  if (!shop.instagram_access_token) {
    return { success: false, error: "Instagram未連携" };
  }

  // トークン有効期限チェック
  if (
    shop.instagram_token_expires_at &&
    new Date(shop.instagram_token_expires_at) < new Date()
  ) {
    return { success: false, error: "トークン期限切れ" };
  }

  // ページネーションで全投稿を取得（最大500件）
  type IGPost = { id: string; media_url: string; caption?: string; permalink: string; timestamp: string; media_type: string };
  const allPosts: IGPost[] = [];
  // /me/media を使用（/{user_id}/media はAPI仕様変更で500を返す場合がある）
  let nextUrl: string | null = `https://graph.instagram.com/me/media?fields=id,caption,media_url,permalink,timestamp,media_type&access_token=${shop.instagram_access_token}&limit=100`;

  while (nextUrl && allPosts.length < 500) {
    const res: Response = await fetch(nextUrl);
    if (!res.ok) {
      const errorBody = await res.text();
      console.error("[Instagram API Error]", res.status, errorBody);
      if (allPosts.length === 0) {
        return {
          success: false,
          error: `Instagram APIエラー (${res.status})`,
          debug: { status: res.status, body: errorBody },
        };
      }
      break;
    }

    const data: { data?: IGPost[]; paging?: { next?: string } } = await res.json();
    console.log("[Instagram API]", `取得: ${data.data?.length ?? 0}件, 次ページ: ${Boolean(data.paging?.next)}`);
    const posts = (data.data ?? []).filter(
      (p: IGPost) =>
        p.media_type === "IMAGE" ||
        p.media_type === "CAROUSEL_ALBUM" ||
        p.media_type === "VIDEO"
    );
    allPosts.push(...posts);
    nextUrl = data.paging?.next ?? null;
  }

  // バッチ upsert（N+1 回避）
  const now = new Date().toISOString();
  const records = allPosts.map((post) => ({
    shop_id: shop.id,
    instagram_post_id: post.id,
    image_url: post.media_url,
    caption: post.caption ?? null,
    permalink: post.permalink,
    posted_at: post.timestamp,
    fetched_at: now,
  }));

  // Supabase upsert は1000件まで対応、100件ずつバッチ処理
  let synced = 0;
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { error: batchError } = await supabase
      .from("instagram_posts")
      .upsert(batch, { onConflict: "shop_id,instagram_post_id" });
    if (batchError) {
      console.error("[Instagram Sync] upsert error:", batchError.message);
      return { success: false, error: `DB保存エラー: ${batchError.message}` };
    }
    synced += batch.length;
  }

  // 最終同期日時を更新
  await supabase
    .from("shops")
    .update({ instagram_synced_at: new Date().toISOString() })
    .eq("id", shop.id);

  return { success: true, synced };
}

/**
 * 店舗の Instagram ストーリーを同期
 * Instagram Graph API からアクティブなストーリーを取得し、
 * メディアを Supabase Storage に保存して instagram_stories テーブルに upsert
 */
export async function syncShopStories(supabase: SupabaseClient, shop: Shop) {
  if (!shop.instagram_access_token) {
    return { success: false, error: "Instagram未連携" };
  }

  if (
    shop.instagram_token_expires_at &&
    new Date(shop.instagram_token_expires_at) < new Date()
  ) {
    return { success: false, error: "トークン期限切れ" };
  }

  // ストーリー一覧を取得
  const res = await fetch(
    `https://graph.instagram.com/me/stories?fields=id,media_type,media_url,timestamp&access_token=${shop.instagram_access_token}`
  );

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[Instagram Stories API Error]", res.status, errorBody);

    // レート制限の場合は特別なエラーを返す
    if (res.status === 429) {
      return { success: false, error: "レート制限", rateLimited: true };
    }

    return {
      success: false,
      error: `Instagram APIエラー (${res.status})`,
    };
  }

  type IGStory = { id: string; media_type: string; media_url: string; timestamp: string };
  const data: { data?: IGStory[] } = await res.json();
  const stories = data.data ?? [];

  if (stories.length === 0) {
    // ストーリーがない場合も同期日時は更新（Cron の差分同期で再処理しない）
    await supabase
      .from("shops")
      .update({ stories_synced_at: new Date().toISOString() })
      .eq("id", shop.id);
    return { success: true, synced: 0 };
  }

  // 既存のストーリー ID を取得（重複スキップ用）
  const { data: existing } = await supabase
    .from("instagram_stories")
    .select("instagram_media_id")
    .eq("shop_id", shop.id);

  const existingIds = new Set((existing ?? []).map((e) => e.instagram_media_id));
  const newStories = stories.filter((s) => !existingIds.has(s.id));

  if (newStories.length === 0) {
    await supabase
      .from("shops")
      .update({ stories_synced_at: new Date().toISOString() })
      .eq("id", shop.id);
    return { success: true, synced: 0 };
  }

  const now = new Date().toISOString();
  const records = [];

  for (const story of newStories) {
    let storedUrl = story.media_url;

    // Storage に保存（画像・動画ともに）
    try {
      const mediaRes = await fetch(story.media_url);
      if (mediaRes.ok) {
        const buffer = Buffer.from(await mediaRes.arrayBuffer());
        const ext = story.media_type === "VIDEO" ? "mp4" : "jpg";
        const filePath = `stories/${shop.id}/${story.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("shop-photos")
          .upload(filePath, buffer, {
            upsert: true,
            contentType: story.media_type === "VIDEO" ? "video/mp4" : "image/jpeg",
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("shop-photos")
            .getPublicUrl(filePath);
          storedUrl = urlData.publicUrl;
        }
      }
    } catch {
      // Storage 保存失敗時は Instagram URL をフォールバック
    }

    const expiresAt = new Date(story.timestamp);
    expiresAt.setHours(expiresAt.getHours() + 24);

    records.push({
      shop_id: shop.id,
      instagram_media_id: story.id,
      media_url: storedUrl,
      media_type: story.media_type === "VIDEO" ? "VIDEO" : "IMAGE",
      timestamp: story.timestamp,
      expires_at: expiresAt.toISOString(),
      fetched_at: now,
    });
  }

  // バッチ upsert
  const { error: upsertError } = await supabase
    .from("instagram_stories")
    .upsert(records, { onConflict: "shop_id,instagram_media_id" });

  if (upsertError) {
    console.error("[Stories Sync] upsert error:", upsertError.message);
    return { success: false, error: `DB保存エラー: ${upsertError.message}` };
  }

  // 同期日時を更新
  await supabase
    .from("shops")
    .update({ stories_synced_at: new Date().toISOString() })
    .eq("id", shop.id);

  return { success: true, synced: records.length };
}
