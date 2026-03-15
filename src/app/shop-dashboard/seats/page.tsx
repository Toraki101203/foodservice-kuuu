import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SeatsClient } from "./seats-client";

export default async function SeatsPage() {
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

  const { data: seatStatus } = await supabase
    .from("seat_status")
    .select("*")
    .eq("shop_id", shop.id)
    .single();

  return (
    <SeatsClient
      shopId={shop.id}
      planType={shop.plan_type}
      initialStatus={seatStatus ?? null}
    />
  );
}
