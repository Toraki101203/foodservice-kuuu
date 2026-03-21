import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const shopId = request.nextUrl.searchParams.get("shopId");
  if (!shopId) {
    return NextResponse.json({ error: "shopId が必要です" }, { status: 400 });
  }

  // オーナー確認
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!shop) {
    return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  }

  const { data: posts } = await supabase
    .from("instagram_posts")
    .select("*")
    .eq("shop_id", shopId)
    .order("posted_at", { ascending: false });

  return NextResponse.json({ posts: posts ?? [] });
}
