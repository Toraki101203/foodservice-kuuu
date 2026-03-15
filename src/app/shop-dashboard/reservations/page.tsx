import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReservationsClient } from "./reservations-client";

export default async function ReservationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, plan_type")
    .eq("owner_id", user.id)
    .single();

  if (!shop) redirect("/");

  // 直近7日間の予約を取得
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 1);
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, profiles:user_id(display_name, email)")
    .eq("shop_id", shop.id)
    .gte("reservation_date", weekAgo.toISOString().slice(0, 10))
    .lte("reservation_date", weekLater.toISOString().slice(0, 10))
    .order("reservation_date")
    .order("reservation_time");

  return (
    <ReservationsClient
      shopId={shop.id}
      initialReservations={reservations ?? []}
    />
  );
}
