import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardOverview } from "./dashboard-overview";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [shopRes, reservationsRes, analyticsRes] = await Promise.all([
        supabase.from("shops").select("*, seat_status(status)").eq("owner_id", user.id).single(),
        supabase.from("reservations").select("*").eq("status", "pending").order("reservation_date", { ascending: true }).limit(5),
        supabase.from("analytics_events").select("event_type").eq("user_id", user.id),
    ]);

    if (!shopRes.data) redirect("/shop-dashboard/profile");

    return (
        <DashboardOverview
            shop={shopRes.data}
            pendingReservations={reservationsRes.data ?? []}
            analyticsCount={analyticsRes.data?.length ?? 0}
        />
    );
}
