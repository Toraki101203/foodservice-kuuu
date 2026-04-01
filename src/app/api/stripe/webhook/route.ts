import { stripe } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

// 必須環境変数の検証（起動時）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_STANDARD_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID;
const STRIPE_PREMIUM_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("Stripe webhook: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / STRIPE_WEBHOOK_SECRET が未設定です");
}

const STRIPE_WEBHOOK_SECRET: string = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe v20+ の型定義に current_period_end が含まれない場合のヘルパー
function getPeriodEnd(sub: Stripe.Subscription): string {
  const raw = sub as unknown as Record<string, unknown>;
  const epoch = typeof raw.current_period_end === "number"
    ? raw.current_period_end
    : Math.floor(Date.now() / 1000);
  return new Date(epoch * 1000).toISOString();
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const shopId = session.metadata?.shop_id;
      if (shopId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = sub.items.data[0]?.price.id;
        const planType =
          priceId === STRIPE_PREMIUM_PRICE_ID
            ? "premium"
            : priceId === STRIPE_STANDARD_PRICE_ID
              ? "standard"
              : "standard";

        await supabaseAdmin.from("subscriptions").upsert(
          {
            shop_id: shopId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: session.customer as string,
            status: "active",
            plan_type: planType,
            current_period_end: getPeriodEnd(sub),
          },
          { onConflict: "shop_id" }
        );

        await supabaseAdmin
          .from("shops")
          .update({ plan_type: planType })
          .eq("id", shopId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: existing } = await supabaseAdmin
        .from("subscriptions")
        .select("shop_id")
        .eq("stripe_subscription_id", sub.id)
        .single();

      if (existing) {
        // Stripe の status を DB に安全にマッピング（trialing/incomplete を canceled にしない）
        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "past_due",
          canceled: "canceled",
          unpaid: "past_due",
        };
        const status = statusMap[sub.status] ?? "active";

        // プラン変更を検出して plan_type も更新
        const priceId = sub.items.data[0]?.price.id;
        const planType =
          priceId === STRIPE_PREMIUM_PRICE_ID
            ? "premium"
            : priceId === STRIPE_STANDARD_PRICE_ID
              ? "standard"
              : null;

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status,
            current_period_end: getPeriodEnd(sub),
            ...(planType && { plan_type: planType }),
          })
          .eq("stripe_subscription_id", sub.id);

        if (status === "canceled") {
          await supabaseAdmin
            .from("shops")
            .update({ plan_type: "free" })
            .eq("id", existing.shop_id);
        } else if (planType) {
          await supabaseAdmin
            .from("shops")
            .update({ plan_type: planType })
            .eq("id", existing.shop_id);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: existing } = await supabaseAdmin
        .from("subscriptions")
        .select("shop_id")
        .eq("stripe_subscription_id", sub.id)
        .single();

      if (existing) {
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id);

        await supabaseAdmin
          .from("shops")
          .update({ plan_type: "free" })
          .eq("id", existing.shop_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
