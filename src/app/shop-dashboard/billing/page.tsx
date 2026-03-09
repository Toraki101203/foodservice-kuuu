import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: shop } = await supabase
        .from("shops")
        .select("id, plan_type")
        .eq("owner_id", user.id)
        .single();

    if (!shop) redirect("/shop-dashboard/profile");

    return <BillingClient currentPlan={shop.plan_type} shopId={shop.id} />;
}
