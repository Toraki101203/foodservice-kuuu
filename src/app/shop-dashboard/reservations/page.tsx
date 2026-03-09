import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardReservationsClient } from "./reservations-client";

export default async function DashboardReservationsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user.id).single();
    if (!shop) redirect("/shop-dashboard/profile");

    const { data: reservations } = await supabase
        .from("reservations")
        .select("*, user:profiles(display_name, email)")
        .eq("shop_id", shop.id)
        .order("reservation_date", { ascending: true });

    return <DashboardReservationsClient reservations={reservations ?? []} shopId={shop.id} />;
}
