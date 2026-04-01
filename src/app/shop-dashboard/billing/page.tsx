import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // service role で取得（RLS バイパス）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: shop } = await serviceSupabase
    .from("shops")
    .select("id, name, plan_type")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!shop) redirect("/");

  const { data: subscription } = await serviceSupabase
    .from("subscriptions")
    .select("*")
    .eq("shop_id", shop.id)
    .maybeSingle();

  return (
    <Suspense fallback={<div className="p-4 text-center text-sm text-gray-400">読み込み中...</div>}>
      <BillingClient
        shopId={shop.id}
        currentPlan={shop.plan_type}
        subscription={subscription ?? null}
      />
    </Suspense>
  );
}
