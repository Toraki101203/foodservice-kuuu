import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`;
  const scope = "instagram_basic,instagram_manage_insights";

  const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;

  return NextResponse.redirect(authUrl);
}
