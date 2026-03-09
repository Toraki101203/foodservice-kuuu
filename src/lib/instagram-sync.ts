import { SupabaseClient } from "@supabase/supabase-js";

export interface ShopWithToken {
    id: string;
    instagram_access_token: string;
    instagram_user_id: string;
    instagram_token_expires_at: string;
}

/**
 * 1店舗分のInstagram投稿を同期
 */
export async function syncShopPosts(supabase: SupabaseClient, shop: ShopWithToken) {
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

        // IMAGE と CAROUSEL_ALBUM と VIDEO
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

/**
 * 1店舗分のInstagramストーリーを同期
 */
export async function syncShopStories(supabase: SupabaseClient, shop: ShopWithToken) {
    try {
        if (new Date(shop.instagram_token_expires_at) < new Date()) {
            return { shopId: shop.id, success: false, error: "トークンの有効期限切れ" };
        }

        const res = await fetch(
            `https://graph.instagram.com/v21.0/${shop.instagram_user_id}/stories?fields=id,media_type,media_url,timestamp&access_token=${shop.instagram_access_token}`
        );

        if (!res.ok) {
            const errText = await res.text();
            return { shopId: shop.id, success: false, error: `Stories API error: ${errText}` };
        }

        const data = await res.json();
        const stories: Array<{
            id: string;
            media_type: string;
            media_url: string;
            timestamp: string;
        }> = data.data || [];

        const validStories = stories.filter(
            (s) => s.media_type === "IMAGE" || s.media_type === "VIDEO"
        );

        const upsertData = validStories.map((s) => ({
            shop_id: shop.id,
            instagram_media_id: s.id,
            media_url: s.media_url,
            media_type: s.media_type,
            timestamp: s.timestamp,
            expires_at: new Date(new Date(s.timestamp).getTime() + 24 * 60 * 60 * 1000).toISOString(),
            fetched_at: new Date().toISOString(),
        }));

        if (upsertData.length > 0) {
            await supabase
                .from("instagram_stories")
                .upsert(upsertData, { onConflict: "shop_id,instagram_media_id" });
        }

        return {
            shopId: shop.id,
            success: true,
            synced: upsertData.length,
        };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return { shopId: shop.id, success: false, error: message };
    }
}
