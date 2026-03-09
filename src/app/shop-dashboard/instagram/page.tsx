import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InstagramDashboardClient } from "./instagram-client";

export default async function InstagramDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: shop } = await supabase
        .from("shops")
        .select("id, instagram_username, instagram_access_token, instagram_synced_at")
        .eq("owner_id", user.id)
        .single();

    if (!shop) redirect("/shop-dashboard/profile");

    const { data: posts } = await supabase
        .from("instagram_posts")
        .select("*")
        .eq("restaurant_id", shop.id)
        .order("posted_at", { ascending: false })
        .limit(12);

    return (
        <InstagramDashboardClient
            shop={shop}
            posts={posts ?? []}
        />
    );
}
