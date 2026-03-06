import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Instagram 投稿自動同期
 *
 * POST: 特定ユーザーの店舗を同期（ダッシュボードから呼ぶ or callback後）
 *   body: { userId: string }
 *
 * GET: 全連携店舗を一括同期（Vercel Cron 等から呼ぶ）
 *   header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const body = await request.json();
    const userId = body.userId as string | undefined;

    if (!userId) {
        // ダッシュボードからの呼び出し: 認証ユーザーの店舗を同期
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
        }

        const { data: shop } = await supabase
            .from("shops")
            .select("id, instagram_access_token, instagram_user_id, instagram_token_expires_at")
            .eq("owner_id", user.id)
            .limit(1)
            .single();

        if (!shop?.instagram_access_token) {
            return NextResponse.json(
                { error: "Instagramが連携されていません" },
                { status: 400 }
            );
        }

        const result = await syncShopPosts(supabase, shop);
        return NextResponse.json(result);
    }

    // callback からの呼び出し
    const { data: shop } = await supabase
        .from("shops")
        .select("id, instagram_access_token, instagram_user_id, instagram_token_expires_at")
        .eq("owner_id", userId)
        .limit(1)
        .single();

    if (!shop?.instagram_access_token) {
        return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    const result = await syncShopPosts(supabase, shop);
    return NextResponse.json(result);
}

/**
 * Cron用: 全連携店舗の一括同期
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // トークンが有効な全店舗を取得
    const { data: shops } = await supabase
        .from("shops")
        .select("id, instagram_access_token, instagram_user_id, instagram_token_expires_at")
        .not("instagram_access_token", "is", null)
        .gt("instagram_token_expires_at", new Date().toISOString());

    if (!shops || shops.length === 0) {
        return NextResponse.json({ message: "同期対象の店舗がありません", synced: 0 });
    }

    const results = await Promise.all(
        shops.map((shop) => syncShopPosts(supabase, shop))
    );

    const synced = results.filter((r) => r.success).length;
    return NextResponse.json({ message: `${synced}/${shops.length}件の店舗を同期しました`, synced });
}

interface ShopWithToken {
    id: string;
    instagram_access_token: string;
    instagram_user_id: string;
    instagram_token_expires_at: string;
}

/**
 * 1店舗分のInstagram投稿を同期
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncShopPosts(supabase: any, shop: ShopWithToken) {
    try {
        // トークンの有効期限チェック
        if (new Date(shop.instagram_token_expires_at) < new Date()) {
            return { shopId: shop.id, success: false, error: "トークンの有効期限切れ" };
        }

        // Instagram Graph API で最新投稿を取得（最大25件）
        const mediaRes = await fetch(
            `https://graph.instagram.com/v21.0/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=25&access_token=${shop.instagram_access_token}`
        );

        if (!mediaRes.ok) {
            const errText = await mediaRes.text();
            return { shopId: shop.id, success: false, error: `API error: ${errText}` };
        }

        const mediaData = await mediaRes.json();
        const posts: Array<{
            id: string;
            caption?: string;
            media_type: string;
            media_url?: string;
            thumbnail_url?: string;
            permalink: string;
            timestamp: string;
        }> = mediaData.data || [];

        // IMAGE と CAROUSEL_ALBUM のみ（VIDEO は thumbnail_url を使う）
        const validPosts = posts.filter(
            (p) => p.media_type === "IMAGE" || p.media_type === "CAROUSEL_ALBUM" || p.media_type === "VIDEO"
        );

        // 既存の投稿IDを取得
        const { data: existingPosts } = await supabase
            .from("instagram_posts")
            .select("instagram_post_id")
            .eq("restaurant_id", shop.id);

        const existingIds = new Set(
            (existingPosts || []).map((p: { instagram_post_id: string }) => p.instagram_post_id)
        );

        // 新しい投稿のみ追加
        const newPosts = validPosts
            .filter((p) => !existingIds.has(p.id))
            .map((p) => ({
                restaurant_id: shop.id,
                instagram_post_id: p.id,
                image_url: p.media_type === "VIDEO" ? (p.thumbnail_url || "") : (p.media_url || ""),
                caption: p.caption || null,
                permalink: p.permalink,
                posted_at: p.timestamp,
                fetched_at: new Date().toISOString(),
            }));

        if (newPosts.length > 0) {
            await supabase.from("instagram_posts").insert(newPosts);
        }

        // 同期日時を更新
        await supabase
            .from("shops")
            .update({ instagram_synced_at: new Date().toISOString() })
            .eq("id", shop.id);

        return {
            shopId: shop.id,
            success: true,
            added: newPosts.length,
            total: validPosts.length,
        };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return { shopId: shop.id, success: false, error: message };
    }
}
