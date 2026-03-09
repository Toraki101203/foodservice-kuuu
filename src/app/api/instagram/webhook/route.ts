import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncShopPosts } from "@/lib/instagram-sync";

/**
 * Instagram Webhook — リアルタイム投稿通知
 *
 * GET: Meta からの Webhook 検証（challenge-response）
 * POST: 新規投稿の通知を受け取り、即座に同期を実行
 *
 * Meta App Dashboard で以下を設定:
 *   Callback URL: https://<domain>/api/instagram/webhook
 *   Verify Token: INSTAGRAM_WEBHOOK_VERIFY_TOKEN の値
 *   Subscribed Fields: media (Instagram)
 */

// Webhook 検証
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

    if (mode === "subscribe" && token === verifyToken) {
        // Meta の検証に応答
        return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Webhook 通知受信
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Instagram の通知か確認
        if (body.object !== "instagram") {
            return NextResponse.json({ received: true });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 各エントリを処理（複数の通知が一度に届くことがある）
        const entries: Array<{ id: string; time: number; changes?: Array<{ field: string }> }> =
            body.entry || [];

        for (const entry of entries) {
            const igUserId = entry.id;

            // media フィールドの変更があるか確認
            const hasMediaChange = entry.changes?.some(
                (change) => change.field === "media"
            );
            if (!hasMediaChange) continue;

            // Instagram User ID で店舗を検索
            const { data: shop } = await supabaseAdmin
                .from("shops")
                .select("id, instagram_access_token, instagram_user_id, instagram_token_expires_at")
                .eq("instagram_user_id", igUserId)
                .not("instagram_access_token", "is", null)
                .single();

            if (!shop?.instagram_access_token) continue;

            // 即座に同期を実行
            await syncShopPosts(supabaseAdmin, shop);
        }

        // Meta には必ず 200 を返す（リトライを防ぐ）
        return NextResponse.json({ received: true });
    } catch {
        // エラーでも 200 を返す（Meta が再送し続けるのを防ぐ）
        return NextResponse.json({ received: true });
    }
}
