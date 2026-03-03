import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

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

        // 店舗のサブスクリプション情報を取得
        const { data: shop } = await supabase
            .from("shops")
            .select("id")
            .eq("owner_id", user.id)
            .limit(1)
            .single();

        if (!shop) {
            return NextResponse.json(
                { error: "店舗が見つかりません" },
                { status: 404 }
            );
        }

        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("stripe_customer_id")
            .eq("shop_id", shop.id)
            .single();

        if (!subscription?.stripe_customer_id) {
            return NextResponse.json(
                { error: "サブスクリプションが見つかりません" },
                { status: 404 }
            );
        }

        // Stripe Customer Portalセッションを作成
        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.stripe_customer_id,
            return_url: `${request.nextUrl.origin}/shop-dashboard/billing`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("Portal error:", error);
        return NextResponse.json(
            { error: "ポータル生成でエラーが発生しました" },
            { status: 500 }
        );
    }
}
