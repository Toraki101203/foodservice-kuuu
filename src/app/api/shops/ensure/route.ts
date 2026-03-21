import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  // Check if shop already exists
  const { data: existing } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ shop: existing });
  }

  // Create new shop
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { data: shop, error } = await supabase
    .from("shops")
    .insert({
      owner_id: user.id,
      name: profile?.display_name
        ? `${profile.display_name}の店舗`
        : "新しい店舗",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "店舗の作成に失敗しました" },
      { status: 500 }
    );
  }

  // Create initial seat_status
  await supabase.from("seat_status").insert({
    shop_id: shop.id,
    status: "closed",
  });

  return NextResponse.json({ shop });
}
