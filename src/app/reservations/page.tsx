import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReservationsList } from "./ReservationsList";
import type { Reservation } from "@/types/database";

/**
 * 予約情報にリレーション先の店舗情報を含めた型
 */
type ReservationWithShop = Reservation & {
    restaurant: {
        name: string;
        address: string;
        phone: string | null;
    } | null;
};

export default async function ReservationsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: reservations } = await supabase
        .from("reservations")
        .select("*, restaurant:shops(name, address, phone)")
        .eq("user_id", user.id)
        .order("reservation_datetime", { ascending: false });

    return (
        <div className="mx-auto max-w-lg px-4 py-6">
            <h1 className="mb-4 text-xl font-bold text-gray-800">予約履歴</h1>
            <ReservationsList
                reservations={(reservations as ReservationWithShop[]) || []}
            />
        </div>
    );
}
