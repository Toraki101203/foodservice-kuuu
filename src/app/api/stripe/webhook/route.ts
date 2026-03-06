import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Stripe Price ID からプランIDを逆引きする
 * 環境変数に設定されたPrice IDとマッチングし、該当するプラン名を返す
 */
function resolvePlanFromPriceId(priceId: string): string {
    const standardPriceId = process.env.STRIPE_STANDARD_PRICE_ID;
    const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;

    if (standardPriceId && priceId === standardPriceId) return "standard";
    if (premiumPriceId && priceId === premiumPriceId) return "premium";

    // マッチしない場合はデフォルト
    return "standard";
}

export async function POST(request: NextRequest) {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
        return NextResponse.json(
            { error: "署名がありません" },
            { status: 400 }
        );
    }

    let event;

    try {
        // Webhook署名の検証（Webhook Secretが設定されている場合）
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (webhookSecret) {
            event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
        } else {
            // 開発環境: 署名検証をスキップ
            event = JSON.parse(body);
        }
    } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return NextResponse.json(
            { error: "署名検証に失敗しました" },
            { status: 400 }
        );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    // WebhookにはCookieがないため、DB更新権限（RLSバイパス）を持つサービスロールキーを使用します
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
        console.error("SUPABASE_SERVICE_ROLE_KEY が設定されていません");
        return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const shopId = session.metadata?.shop_id;
                const planId = session.metadata?.plan_id || "standard";

                if (shopId && session.subscription) {
                    // 既存のサブスクリプションを確認
                    const { data: existingSub } = await supabase
                        .from("subscriptions")
                        .select("id")
                        .eq("shop_id", shopId)
                        .maybeSingle();

                    const subscriptionData = {
                        shop_id: shopId,
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: session.subscription as string,
                        plan: planId,
                        status: "active",
                        current_period_start: new Date().toISOString(),
                    };

                    if (existingSub) {
                        await supabase
                            .from("subscriptions")
                            .update(subscriptionData)
                            .eq("id", existingSub.id);
                    } else {
                        await supabase
                            .from("subscriptions")
                            .insert(subscriptionData);
                    }
                }
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object;

                // Price IDからプランを特定
                const priceId = subscription.items?.data?.[0]?.price?.id;
                const plan = priceId
                    ? resolvePlanFromPriceId(priceId)
                    : undefined;

                const updateData: Record<string, string> = {
                    status:
                        subscription.status === "active"
                            ? "active"
                            : subscription.status,
                    current_period_start: new Date(
                        subscription.current_period_start * 1000
                    ).toISOString(),
                    current_period_end: new Date(
                        subscription.current_period_end * 1000
                    ).toISOString(),
                };

                // プランが特定できた場合のみ更新
                if (plan) {
                    updateData.plan = plan;
                }

                await supabase
                    .from("subscriptions")
                    .update(updateData)
                    .eq("stripe_subscription_id", subscription.id);
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object;
                await supabase
                    .from("subscriptions")
                    .update({ status: "cancelled" })
                    .eq("stripe_subscription_id", subscription.id);
                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    await supabase
                        .from("subscriptions")
                        .update({ status: "past_due" })
                        .eq("stripe_subscription_id", invoice.subscription);
                }
                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json(
            { error: "Webhook処理でエラーが発生しました" },
            { status: 500 }
        );
    }
}
