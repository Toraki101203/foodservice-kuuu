import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Instagram OAuth コールバック
 * 認証コードを受け取り、アクセストークンに交換して保存する
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // user.id
    const errorParam = searchParams.get("error");

    // ユーザーが拒否した場合
    if (errorParam) {
        return NextResponse.redirect(
            `${SITE_URL}/shop-dashboard/instagram?error=denied`
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            `${SITE_URL}/shop-dashboard/instagram?error=invalid`
        );
    }

    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;

    if (!appId || !appSecret) {
        return NextResponse.redirect(
            `${SITE_URL}/shop-dashboard/instagram?error=config`
        );
    }

    const redirectUri = `${SITE_URL}/api/instagram/callback`;

    try {
        // 1. 認証コードを短期トークンに交換
        const tokenRes = await fetch(
            "https://api.instagram.com/oauth/access_token",
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: appId,
                    client_secret: appSecret,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri,
                    code,
                }),
            }
        );

        if (!tokenRes.ok) {
            return NextResponse.redirect(
                `${SITE_URL}/shop-dashboard/instagram?error=token`
            );
        }

        const tokenData = await tokenRes.json();
        const shortLivedToken: string = tokenData.access_token;
        const igUserId: string = String(tokenData.user_id);

        // 2. 短期トークンを長期トークンに交換（60日間有効）
        const longLivedRes = await fetch(
            `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
        );

        let accessToken = shortLivedToken;
        let expiresAt = new Date(Date.now() + 3600 * 1000); // 1時間（短期のデフォルト）

        if (longLivedRes.ok) {
            const longLivedData = await longLivedRes.json();
            accessToken = longLivedData.access_token;
            expiresAt = new Date(
                Date.now() + (longLivedData.expires_in || 5184000) * 1000
            );
        }

        // 3. Instagram ユーザー情報を取得してユーザー名を更新
        const profileRes = await fetch(
            `https://graph.instagram.com/v21.0/me?fields=username&access_token=${accessToken}`
        );

        let igUsername: string | null = null;
        if (profileRes.ok) {
            const profileData = await profileRes.json();
            igUsername = profileData.username || null;
        }

        // 4. DBに保存
        const supabase = await createClient();
        const updateData: Record<string, unknown> = {
            instagram_access_token: accessToken,
            instagram_token_expires_at: expiresAt.toISOString(),
            instagram_user_id: igUserId,
        };
        if (igUsername) {
            updateData.instagram_username = igUsername;
        }

        await supabase
            .from("shops")
            .update(updateData)
            .eq("owner_id", state);

        // 5. 初回同期を実行
        const syncRes = await fetch(`${SITE_URL}/api/instagram/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: state }),
        });

        const syncParam = syncRes.ok ? "&synced=true" : "";

        return NextResponse.redirect(
            `${SITE_URL}/shop-dashboard/instagram?connected=true${syncParam}`
        );
    } catch {
        return NextResponse.redirect(
            `${SITE_URL}/shop-dashboard/instagram?error=unknown`
        );
    }
}
