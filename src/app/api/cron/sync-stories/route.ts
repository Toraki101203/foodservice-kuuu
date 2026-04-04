import { createClient } from "@supabase/supabase-js";
import { syncShopStories } from "@/lib/instagram-sync";
import { NextResponse } from "next/server";

/**
 * ストーリー定期同期 Cron エンドポイント
 * - 差分同期: stories_synced_at が古い店舗のみ対象
 * - バッチ分散: 10店舗ずつ処理、バッチ間1秒待機
 * - 期限切れストーリーの削除
 */
export async function GET(request: Request) {
  // Cron シークレットによる認証（未設定時は500エラー）
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. 期限切れストーリーを削除（同一タイムスタンプで統一）
  const expiredBefore = new Date().toISOString();
  const { data: expiredStories } = await supabase
    .from("instagram_stories")
    .select("id, shop_id, instagram_media_id, media_url")
    .lt("expires_at", expiredBefore);

  if (expiredStories && expiredStories.length > 0) {
    // Storage からファイルを削除（media_url からパスを抽出）
    const storagePaths = expiredStories
      .map((s) => {
        try {
          const url = new URL(s.media_url);
          const match = url.pathname.match(/\/shop-photos\/(.+)$/);
          return match ? match[1] : null;
        } catch {
          return null;
        }
      })
      .filter((p): p is string => p !== null);

    if (storagePaths.length > 0) {
      await supabase.storage.from("shop-photos").remove(storagePaths);
    }

    // DB レコードを削除
    await supabase
      .from("instagram_stories")
      .delete()
      .lt("expires_at", expiredBefore);
  }

  // 2. 差分同期: stories_synced_at が15分以上前の Instagram 連携店舗を取得
  const syncThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: shops } = await supabase
    .from("shops")
    .select("*")
    .not("instagram_access_token", "is", null)
    .or(`stories_synced_at.is.null,stories_synced_at.lt.${syncThreshold}`)
    .order("stories_synced_at", { ascending: true, nullsFirst: true })
    .limit(60); // 最大60店舗/回（10店舗×6バッチ）

  if (!shops || shops.length === 0) {
    return NextResponse.json({
      success: true,
      expired_deleted: expiredStories?.length ?? 0,
      synced: 0,
      message: "同期対象の店舗なし",
    });
  }

  // 3. バッチ分散同期（10店舗/バッチ、バッチ間1秒待機）
  const BATCH_SIZE = 10;
  let totalSynced = 0;
  let rateLimited = false;

  for (let i = 0; i < shops.length; i += BATCH_SIZE) {
    if (rateLimited) break;

    const batch = shops.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((shop) => syncShopStories(supabase, shop))
    );

    for (const result of results) {
      if (result.success && result.synced) {
        totalSynced += result.synced;
      } else if ("rateLimited" in result && result.rateLimited) {
        rateLimited = true;
        break;
      }
    }

    // バッチ間待機（最後のバッチでは不要）
    if (i + BATCH_SIZE < shops.length && !rateLimited) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return NextResponse.json({
    success: true,
    expired_deleted: expiredStories?.length ?? 0,
    synced: totalSynced,
    shops_processed: shops.length,
    rate_limited: rateLimited,
  });
}
