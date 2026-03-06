import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Instagram OAuth 認証開始
 * ダッシュボードから呼ばれ、Instagram認証画面にリダイレクトする
 */
export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
    }

    const appId = process.env.INSTAGRAM_APP_ID;
    if (!appId) {
        return NextResponse.json(
            { error: "Instagram App ID が設定されていません" },
            { status: 500 }
        );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/instagram/callback`;
    const scope = "instagram_business_basic";

    const authUrl = new URL("https://www.instagram.com/oauth/authorize");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", user.id);

    return NextResponse.redirect(authUrl.toString());
}
