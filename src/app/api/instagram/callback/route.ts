import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  // 認証チェック（anon キーでユーザー確認）
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  // CSRF 検証: state パラメータを cookie と照合
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("instagram_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      `${siteUrl}/shop-dashboard/instagram?error=csrf_mismatch`
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      `${siteUrl}/shop-dashboard/instagram?error=no_code`
    );
  }

  const appId = process.env.INSTAGRAM_APP_ID!;
  const appSecret = process.env.INSTAGRAM_APP_SECRET!;
  // トークン交換時の redirect_uri は Meta に登録したものと一致させる
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI
    ?? `${siteUrl}/api/instagram/callback`;

  // 短命トークンに交換
  const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${siteUrl}/shop-dashboard/instagram?error=token_exchange`
    );
  }

  const tokenData = await tokenRes.json();

  // 長命トークンに交換
  const longTokenRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${tokenData.access_token}`
  );
  const longTokenData = await longTokenRes.json();

  // Instagram ユーザー情報取得
  const userRes = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${longTokenData.access_token}`
  );
  const userData = await userRes.json();

  const expiresAt = new Date();
  expiresAt.setSeconds(
    expiresAt.getSeconds() + (longTokenData.expires_in || 5184000)
  );

  // service role で書き込み（RLS バイパス — access_token 等の機密カラムを確実に保存）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: updateError } = await serviceSupabase
    .from("shops")
    .update({
      instagram_access_token: longTokenData.access_token,
      instagram_token_expires_at: expiresAt.toISOString(),
      instagram_user_id: userData.id,
      instagram_username: userData.username,
    })
    .eq("owner_id", user.id);

  if (updateError) {
    console.error("[Instagram Callback] shops update failed:", updateError.message);
    return NextResponse.redirect(
      `${siteUrl}/shop-dashboard/instagram?error=db_update`
    );
  }

  // state cookie を削除
  const response = NextResponse.redirect(
    `${siteUrl}/shop-dashboard/instagram?success=true`
  );
  response.cookies.delete("instagram_oauth_state");
  return response;
}
