import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { syncShopPosts } from "@/lib/instagram-sync";
import { NextResponse } from "next/server";

export async function POST() {
  // 認証チェック（anon キー）
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
    .limit(1)
    .maybeSingle();

  if (!shop) {
    return NextResponse.json(
      { error: "店舗が見つかりません" },
      { status: 404 }
    );
  }

  // DB 書き込みは service role で実行（RLS バイパス）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const result = await syncShopPosts(serviceSupabase, shop);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, debug: result.debug },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
}
