import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FavoritesClient } from "./favorites-client";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: favorites } = await supabase
    .from("favorites")
    .select("*, shop:shops(*, seat_status(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <FavoritesClient favorites={favorites ?? []} />;
}
