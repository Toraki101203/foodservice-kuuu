import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { shopId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { shopId } = body;
  if (typeof shopId !== "string") {
    return NextResponse.json({ error: "パラメータが不正です" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  // service role で取得（RLS バイパス）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 所有権チェック
  const { data: shop } = await serviceSupabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("owner_id", user.id)
    .single();

  if (!shop) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { data: subscription } = await serviceSupabase
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("shop_id", shopId)
    .maybeSingle();

  if (!subscription?.stripe_subscription_id || subscription.status !== "active") {
    return NextResponse.json(
      { error: "アクティブなサブスクリプションが見つかりません" },
      { status: 404 }
    );
  }

  // 期間終了時に解約（即座に解約しない）
  try {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  } catch {
    return NextResponse.json(
      { error: "解約処理に失敗しました。しばらく経ってからお試しください。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
