import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { PLANS } from "@/lib/stripe/plans";
import { NextResponse } from "next/server";
import type { PlanType } from "@/types/database";

export async function POST(request: Request) {
  const { planId, shopId } = await request.json();

  // planId をサーバー側で検証（クライアントの priceId を信用しない）
  const plan = PLANS[planId as PlanType];
  if (!plan || !plan.priceId) {
    return NextResponse.json({ error: "無効なプランです" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  // 所有権チェック
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("owner_id", user.id)
    .single();

  if (!shop) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  // Stripe 顧客の取得 or 作成
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("shop_id", shopId)
    .single();

  let customerId = subscription?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: { shop_id: shopId, user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from("subscriptions")
      .upsert(
        {
          shop_id: shopId,
          stripe_customer_id: customerId,
        },
        { onConflict: "shop_id" }
      );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/shop-dashboard/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/shop-dashboard/billing?canceled=true`,
    metadata: { shop_id: shopId },
  });

  return NextResponse.json({ url: session.url });
}
