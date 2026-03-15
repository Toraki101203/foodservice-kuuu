import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/shop-dashboard/instagram?error=no_code`
    );
  }

  const appId = process.env.INSTAGRAM_APP_ID!;
  const appSecret = process.env.INSTAGRAM_APP_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`;

  // Exchange code for short-lived token
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
      `${process.env.NEXT_PUBLIC_SITE_URL}/shop-dashboard/instagram?error=token_exchange`
    );
  }

  const tokenData = await tokenRes.json();

  // Exchange for long-lived token
  const longTokenRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${tokenData.access_token}`
  );
  const longTokenData = await longTokenRes.json();

  // Get Instagram user info
  const userRes = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${longTokenData.access_token}`
  );
  const userData = await userRes.json();

  // Save to database
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/login`);
  }

  const expiresAt = new Date();
  expiresAt.setSeconds(
    expiresAt.getSeconds() + (longTokenData.expires_in || 5184000)
  );

  await supabase
    .from("shops")
    .update({
      instagram_access_token: longTokenData.access_token,
      instagram_token_expires_at: expiresAt.toISOString(),
      instagram_user_id: userData.id,
      instagram_username: userData.username,
    })
    .eq("owner_id", user.id);

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_SITE_URL}/shop-dashboard/instagram?success=true`
  );
}
