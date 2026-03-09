import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const { data: shops, error: shopsError } = await supabase.from("shops").select("*");
    if (shopsError) {
        console.error("shops error:", shopsError);
        return;
    }

    console.log("Found shops:", shops.length);

    for (const shop of shops) {
        console.log(`Updating shop ${shop.id} (${shop.name})...`);

        // Update shop plan_type
        await supabase.from("shops").update({ plan_type: "premium" }).eq("id", shop.id);

        // Insert or update subscription
        const subData = {
            shop_id: shop.id,
            plan: "premium",
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            stripe_customer_id: "cus_local_dev",
            stripe_subscription_id: "sub_local_dev_" + Date.now(),
        };

        const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("shop_id", shop.id)
            .maybeSingle();

        if (existingSub) {
            await supabase.from("subscriptions").update(subData).eq("id", existingSub.id);
            console.log("Updated subscription for shop", shop.id);
        } else {
            await supabase.from("subscriptions").insert(subData);
            console.log("Inserted subscription for shop", shop.id);
        }
    }
    console.log("Done.");
}

main().catch(console.error);
