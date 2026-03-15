import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PartnerDashboard } from "./partner-dashboard";

export default async function PartnerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("*, partner_referrals(*, shops(name, plan_type)), partner_payouts(*)")
    .eq("user_id", user.id)
    .single();

  if (!partner) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">パートナー登録されていません。</p>
      </div>
    );
  }

  return <PartnerDashboard partner={partner} />;
}
