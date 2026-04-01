import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  // service role で確認（RLS による取得漏れを防止）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: existing } = await serviceSupabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ shop: existing });
  }

  // Create new shop
  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { data: shop, error } = await serviceSupabase
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

  await serviceSupabase.from("seat_status").insert({
    shop_id: shop.id,
    status: "closed",
  });

  return NextResponse.json({ shop });
}
