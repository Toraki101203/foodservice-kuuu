import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const { data: shop } = await supabase
    .from("shops")
    .select("id, instagram_access_token, instagram_user_id, instagram_username")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  // instagram_posts テーブルの存在チェック
  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: postsCheck, error: postsError } = await serviceSupabase
    .from("instagram_posts")
    .select("id")
    .limit(1);

  // Instagram API テスト（トークンがあれば）
  let apiTest = null;
  if (shop?.instagram_access_token) {
    const meRes = await fetch(
      `https://graph.instagram.com/v21.0/me/media?fields=id,media_type&access_token=${shop.instagram_access_token}&limit=1`
    );
    apiTest = { status: meRes.status, body: await meRes.json() };
  }

  return NextResponse.json({
    shop: shop ? {
      id: shop.id,
      has_access_token: Boolean(shop.instagram_access_token),
      instagram_user_id: shop.instagram_user_id,
      instagram_username: shop.instagram_username,
    } : null,
    instagram_posts_table: {
      exists: !postsError,
      error: postsError?.message ?? null,
      count: postsCheck?.length ?? 0,
    },
    api_test: apiTest,
  });
}
