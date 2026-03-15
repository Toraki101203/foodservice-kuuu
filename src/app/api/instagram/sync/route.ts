import { createClient } from "@/lib/supabase/server";
import { syncShopPosts } from "@/lib/instagram-sync";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!shop) {
    return NextResponse.json(
      { error: "店舗が見つかりません" },
      { status: 404 }
    );
  }

  const result = await syncShopPosts(supabase, shop);
  return NextResponse.json(result);
}
