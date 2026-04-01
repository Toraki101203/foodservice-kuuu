import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const supabase = await createClient();

    // 1. 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return NextResponse.json({ step: "auth", error: authError.message });
    }
    if (!user) {
      return NextResponse.json({ step: "auth", error: "no user" });
    }

    // 2. プロフィール取得
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (profileError) {
      return NextResponse.json({ step: "profile", error: profileError.message });
    }

    // 3. 店舗取得（Instagram連携情報含む）
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("*")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    // 4. Instagram posts カウント
    const { count: postsCount } = await supabase
      .from("instagram_posts")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop?.id ?? "");

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile,
      shop: shop ? {
        id: shop.id,
        name: shop.name,
        instagram_username: shop.instagram_username,
        instagram_user_id: shop.instagram_user_id,
        instagram_synced_at: shop.instagram_synced_at,
        instagram_token_expires_at: shop.instagram_token_expires_at,
        has_access_token: Boolean(shop.instagram_access_token),
      } : null,
      shopError: shopError?.message ?? null,
      postsCount: postsCount ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), stack: (err as Error).stack },
      { status: 500 }
    );
  }
}
