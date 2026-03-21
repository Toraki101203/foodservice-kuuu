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
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!shop) redirect("/");

  const today = new Date().toISOString().slice(0, 10);

  // 本日の統計データを並列取得
  const [
    { count: visitCount },
    { count: viewCount },
    { count: followerCount },
    { data: recentVisits },
    { data: recentPosts },
  ] = await Promise.all([
    // 本日の来店（キャンセル除外）
    supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .eq("reservation_date", today)
      .neq("status", "cancelled"),
    // 本日の閲覧数
    supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .eq("event_type", "view")
      .gte("created_at", `${today}T00:00:00`),
    // フォロワー数（follows テーブル）
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id),
    // 本日の来店通知（直近3件、キャンセル除外）
    supabase
      .from("reservations")
      .select("*, profiles:user_id(display_name)")
      .eq("shop_id", shop.id)
      .eq("reservation_date", today)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
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
        reservations: visitCount ?? 0,
        views: viewCount ?? 0,
        favorites: followerCount ?? 0,
      }}
      recentReservations={recentVisits ?? []}
      recentPosts={recentPosts ?? []}
    />
  );
}
