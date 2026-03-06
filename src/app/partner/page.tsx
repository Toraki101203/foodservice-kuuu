import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PartnerDashboard } from "./PartnerDashboard";

export default async function PartnerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [partnerResult, referralsResult, payoutsResult] = await Promise.all([
    supabase.from("partners").select("*").eq("user_id", user.id).single(),
    supabase
      .from("partner_referrals")
      .select("*, restaurant:shops(name, plan_type)")
      .order("contracted_at", { ascending: false }),
    supabase
      .from("partner_payouts")
      .select("*")
      .order("period_end", { ascending: false }),
  ]);

  if (!partnerResult.data) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <p className="text-lg font-bold text-gray-800">
          パートナー登録がありません
        </p>
        <p className="mt-2 text-sm text-gray-500">
          パートナーとしての登録は管理者にお問い合わせください。
        </p>
      </div>
    );
  }

  return (
    <PartnerDashboard
      partner={partnerResult.data}
      referrals={referralsResult.data || []}
      payouts={payoutsResult.data || []}
    />
  );
}
