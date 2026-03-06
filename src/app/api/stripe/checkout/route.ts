import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/stripe/plans";

/**
 * プランIDからStripeのPrice IDを取得する
 * 環境変数に設定がある場合はそちらを優先（本番Stripe連携）
 * 設定がない場合はprice_dataでインラインPrice作成にフォールバック
 */
function getStripePriceId(planId: PlanId): string | null {
    const priceMap: Record<string, string | undefined> = {
        standard: process.env.STRIPE_STANDARD_PRICE_ID,
        premium: process.env.STRIPE_PREMIUM_PRICE_ID,
    };
    return priceMap[planId] || null;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "ログインが必要です" },
                { status: 401 }
            );
        }

        const { planId } = (await request.json()) as { planId: PlanId };

        if (!PLANS[planId] || planId === "free") {
            return NextResponse.json(
                { error: "無効なプランです" },
                { status: 400 }
            );
        }

        const plan = PLANS[planId];

        // 店舗情報を取得
        const { data: shop } = await supabase
            .from("shops")
            .select("id, name")
            .eq("owner_id", user.id)
            .limit(1)
            .single();

        if (!shop) {
            return NextResponse.json(
                { error: "店舗が見つかりません" },
                { status: 404 }
            );
        }

        // 既存のStripe顧客を検索、なければ作成
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("stripe_customer_id")
            .eq("shop_id", shop.id)
            .single();

        let customerId = subscription?.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    shop_id: shop.id,
                    user_id: user.id,
                },
            });
            customerId = customer.id;
        }

        // Stripe Price IDが環境変数に設定されているか確認
        const stripePriceId = getStripePriceId(planId);

        // line_items の組み立て
        const lineItems = stripePriceId
            ? [{ price: stripePriceId, quantity: 1 }]
            : [
                  {
                      price_data: {
                          currency: "jpy",
                          product_data: {
                              name: `Kuuu ${plan.name}`,
                              description: `${shop.name} - ${plan.description}`,
                          },
                          unit_amount: plan.price,
                          recurring: { interval: "month" as const },
                      },
                      quantity: 1,
                  },
              ];

        // Checkout Sessionを作成
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: lineItems,
            success_url: `${request.nextUrl.origin}/shop-dashboard/billing?success=true`,
            cancel_url: `${request.nextUrl.origin}/shop-dashboard/billing?cancelled=true`,
            metadata: {
                shop_id: shop.id,
                plan_id: planId,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("Checkout error:", error);
        return NextResponse.json(
            { error: "決済処理でエラーが発生しました" },
            { status: 500 }
        );
    }
}
