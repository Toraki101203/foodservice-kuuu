import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { syncShopPosts, syncShopStories } from "@/lib/instagram-sync";

/**
 * Instagram 投稿自動同期
 *
 * POST: ダッシュボードから呼び出し — 認証ユーザーの店舗を同期
 * GET:  Vercel Cron から呼び出し — 全連携店舗を一括同期
 *
 * syncShopPosts は service_role クライアントで実行（RLS バイパス）
 */

function getAdminClient() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(request: NextRequest) {
    // 認証チェックはユーザーセッションで行う
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // DB 操作は service_role で行う（RLS バイパス）
    const admin = getAdminClient();

    const { data: shop } = await admin
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

    const [postsResult, storiesResult] = await Promise.all([
        syncShopPosts(admin, shop),
        syncShopStories(admin, shop),
    ]);
    return NextResponse.json({ posts: postsResult, stories: storiesResult });
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

    const admin = getAdminClient();

    // トークンが有効な全店舗を取得
    const { data: shops } = await admin
        .from("shops")
        .select("id, instagram_access_token, instagram_user_id, instagram_token_expires_at")
        .not("instagram_access_token", "is", null)
        .gt("instagram_token_expires_at", new Date().toISOString());

    if (!shops || shops.length === 0) {
        return NextResponse.json({ message: "同期対象の店舗がありません", synced: 0 });
    }

    const results = await Promise.all(
        shops.map(async (shop) => {
            const [posts, stories] = await Promise.all([
                syncShopPosts(admin, shop),
                syncShopStories(admin, shop),
            ]);
            return { posts, stories };
        })
    );

    const synced = results.filter((r) => r.posts.success).length;
    return NextResponse.json({ message: `${synced}/${shops.length}件の店舗を同期しました`, synced });
}
