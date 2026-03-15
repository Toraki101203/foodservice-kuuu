import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { priceId, shopId } = await request.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  // Check if shop already has a Stripe customer
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
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/shop-dashboard/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/shop-dashboard/billing?canceled=true`,
    metadata: { shop_id: shopId },
  });

  return NextResponse.json({ url: session.url });
}
