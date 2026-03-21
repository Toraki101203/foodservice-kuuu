import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReservationsClient } from "./reservations-client";

export default async function VisitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, plan_type")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!shop) redirect("/");

  // 今日の来店通知を取得
  const today = new Date().toISOString().slice(0, 10);

  const { data: visits } = await supabase
    .from("reservations")
    .select("*, profiles:user_id(display_name)")
    .eq("shop_id", shop.id)
    .eq("reservation_date", today)
    .order("created_at", { ascending: false });

  return (
    <ReservationsClient
      shopId={shop.id}
      initialVisits={visits ?? []}
    />
  );
}
