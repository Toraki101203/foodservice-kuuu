import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe/server";
import { PLANS } from "@/lib/stripe/plans";
import { NextResponse } from "next/server";
import type { PlanType } from "@/types/database";

export async function POST(request: Request) {
  let body: { planId?: unknown; shopId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { planId, shopId } = body;
  if (typeof planId !== "string" || typeof shopId !== "string") {
    return NextResponse.json({ error: "パラメータが不正です" }, { status: 400 });
  }

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

  // サブスクリプション情報を一括取得（重複クエリ防止）
  const { data: subscription } = await serviceSupabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id, status")
    .eq("shop_id", shopId)
    .maybeSingle();

  let customerId = subscription?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? "",
      metadata: { shop_id: shopId, user_id: user.id },
    });
    customerId = customer.id;

    await serviceSupabase
      .from("subscriptions")
      .upsert(
        {
          shop_id: shopId,
          stripe_customer_id: customerId,
        },
        { onConflict: "shop_id" }
      );
  }

  // 既存のアクティブなサブスクリプションがある場合はプラン変更（Checkout 不要）
  if (subscription?.stripe_subscription_id && subscription.status === "active") {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id
      );

      // 既に同じプランなら何もしない
      if (stripeSub.items.data[0]?.price.id === plan.priceId) {
        return NextResponse.json({
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/shop-dashboard/billing`,
        });
      }

      // 既存サブスクリプションの Price を変更（日割り計算適用）
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [
          {
            id: stripeSub.items.data[0].id,
            price: plan.priceId,
          },
        ],
        proration_behavior: "create_prorations",
      });

      return NextResponse.json({
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/shop-dashboard/billing?success=true`,
      });
    } catch {
      return NextResponse.json(
        { error: "プラン変更に失敗しました。しばらく経ってからお試しください。" },
        { status: 500 }
      );
    }
  }

  // 新規サブスクリプション: Stripe Checkout へ遷移
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
