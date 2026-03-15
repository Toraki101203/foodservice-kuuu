import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardOverview } from "./dashboard-overview";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("*, seat_status(*)")
    .eq("owner_id", user.id)
    .single();

  if (!shop) redirect("/");

  const today = new Date().toISOString().slice(0, 10);

  // 本日の統計データを並列取得
  const [
    { count: reservationCount },
    { count: viewCount },
    { count: favoriteCount },
    { data: recentReservations },
    { data: recentPosts },
  ] = await Promise.all([
    supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .eq("reservation_date", today),
    supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .eq("event_type", "view")
      .gte("created_at", `${today}T00:00:00`),
    supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id),
    supabase
      .from("reservations")
      .select("*, profiles:user_id(display_name)")
      .eq("shop_id", shop.id)
      .eq("reservation_date", today)
      .order("reservation_time")
      .limit(3),
    supabase
      .from("instagram_posts")
      .select("*")
      .eq("shop_id", shop.id)
      .order("posted_at", { ascending: false })
      .limit(3),
  ]);

  return (
    <DashboardOverview
      shop={shop}
      stats={{
        reservations: reservationCount ?? 0,
        views: viewCount ?? 0,
        favorites: favoriteCount ?? 0,
      }}
      recentReservations={recentReservations ?? []}
      recentPosts={recentPosts ?? []}
    />
  );
}
