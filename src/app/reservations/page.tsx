import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReservationsClient } from "./reservations-client";

export default async function ReservationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, shop:shops(name, main_image)")
    .eq("user_id", user.id)
    .order("reservation_date", { ascending: false });

  return <ReservationsClient reservations={reservations ?? []} />;
}
