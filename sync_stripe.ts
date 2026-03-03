import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim();
        }
    });
}

// 修正点：APIバージョンとTypeScriptエラーを解消
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-01-28.clover",
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncSubscriptions() {
    console.log("Fetching Stripe subscriptions...");
    try {
        const subscriptions = await stripe.subscriptions.list({
            status: "active",
            expand: ["data.customer"],
        });

        console.log(`Found ${subscriptions.data.length} active subscriptions in Stripe.`);

        for (const sub of subscriptions.data) {
            const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

            const customer = typeof sub.customer === "string"
                ? await stripe.customers.retrieve(customerId)
                : (sub.customer as Stripe.Customer);

            if (customer.deleted) {
                console.log(`Customer ${customerId} is deleted, skipping.`);
                continue;
            }

            let shopId = customer.metadata?.shop_id || "";

            if (!shopId) {
                const sessions = await stripe.checkout.sessions.list({
                    subscription: sub.id,
                });
                if (sessions.data.length > 0) {
                    shopId = sessions.data[0].metadata?.shop_id || "";

                    if (!customer.metadata?.shop_id && shopId) {
                        // Backfill customer metadata
                        await stripe.customers.update(customerId, {
                            metadata: { shop_id: shopId }
                        });
                    }
                }
            }

            if (shopId) {
                let planId = "starter";
                const sessions = await stripe.checkout.sessions.list({
                    subscription: sub.id,
                });
                if (sessions.data.length > 0 && sessions.data[0].metadata?.plan_id) {
                    planId = sessions.data[0].metadata.plan_id;
                }

                // (as any) is used here because sub.current_period_start typed in current API version differs slightly in type defs, but it's a number
                const currentPeriodStart = (sub as any).current_period_start * 1000;
                const currentPeriodEnd = (sub as any).current_period_end * 1000;

                const { data: existingSub } = await supabase
                    .from("subscriptions")
                    .select("id")
                    .eq("shop_id", shopId)
                    .maybeSingle();

                const subData = {
                    shop_id: shopId,
                    stripe_customer_id: customerId,
                    stripe_subscription_id: sub.id,
                    plan: planId,
                    status: "active",
                    current_period_start: new Date(currentPeriodStart).toISOString(),
                    // current_period_end: new Date(currentPeriodEnd).toISOString(),
                };

                if (existingSub) {
                    const { error } = await supabase.from("subscriptions").update(subData).eq("id", existingSub.id);
                    if (error) console.error(`Failed to update shop ${shopId}:`, error);
                    else console.log(`Successfully updated subscription for shop ${shopId}`);
                } else {
                    const { error } = await supabase.from("subscriptions").insert(subData);
                    if (error) console.error(`Failed to insert shop ${shopId}:`, error);
                    else console.log(`Successfully inserted subscription for shop ${shopId}`);
                }
            } else {
                console.log(`Could not identify shop for subscription ${sub.id}`);
            }
        }
    } catch (error) {
        console.error("Error connecting to Stripe:", error);
    }
}

syncSubscriptions().catch(console.error);
