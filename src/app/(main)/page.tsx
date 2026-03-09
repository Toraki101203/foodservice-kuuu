import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HomeClient } from "./home-client";

export default async function HomePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/landing");
    }

    // まずフォロー中の shop_id リストを取得
    const { data: followIds } = await supabase
        .from("follows")
        .select("shop_id")
        .eq("user_id", user.id);

    const followingShopIds = (followIds ?? []).map((f: { shop_id: string }) => f.shop_id);

    const [followingRes, nearbyRes, popularRes, storiesRes] = await Promise.all([
        // フォロー中の店舗の投稿（フォローがある場合のみ）
        followingShopIds.length > 0
            ? supabase
                .from("instagram_posts")
                .select("*, restaurant:shops!inner(id, name, genre, address, main_image, latitude, longitude)")
                .in("restaurant_id", followingShopIds)
                .order("posted_at", { ascending: false })
                .limit(20)
            : Promise.resolve({ data: [] }),
        supabase
            .from("shops")
            .select("*")
            .eq("status", "active")
            .limit(20),
        supabase
            .from("instagram_posts")
            .select("*, restaurant:shops!inner(id, name, genre, address, main_image)")
            .order("posted_at", { ascending: false })
            .limit(20),
        supabase
            .from("instagram_stories")
            .select("*, shop:shops(id, name, main_image)")
            .gt("expires_at", new Date().toISOString())
            .order("timestamp", { ascending: false }),
    ]);

    return (
        <HomeClient
            followingPosts={followingRes.data ?? []}
            nearbyShops={nearbyRes.data ?? []}
            popularPosts={popularRes.data ?? []}
            stories={storiesRes.data ?? []}
            followingIds={followingShopIds}
            userId={user.id}
        />
    );
}
