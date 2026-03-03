import { createClient } from "@/lib/supabase/server";
import HomeFeed from "@/components/timeline/HomeFeed";
import type { Database } from "@/types/database";

type PostWithShop = Database["public"]["Tables"]["posts"]["Row"] & {
    shop: Database["public"]["Tables"]["shops"]["Row"];
    coupon: any | null;
};

export default async function HomePage() {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    // 投稿と店舗情報を取得
    const { data: rawPosts, error } = await supabase
        .from("posts")
        .select(`
            *,
            shop:shops(*)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching posts:", error);
    }

    const activePosts = (rawPosts || []).filter((p: any) => p.shop !== null) as unknown as PostWithShop[];

    // おすすめ店舗を取得（最新更新順、最大10件）
    const { data: recommendedShops } = await supabase
        .from("shops")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(10);

    let initialFavoriteShopIds: string[] = [];
    if (authData?.user) {
        const { data: favs } = await supabase
            .from("favorites")
            .select("restaurant_id")
            .eq("user_id", authData.user.id);
        if (favs) {
            initialFavoriteShopIds = favs.map((f: any) => f.restaurant_id);
        }
    }

    return (
        <HomeFeed
            posts={activePosts}
            initialFavoriteShopIds={initialFavoriteShopIds}
            recommendedShops={recommendedShops || []}
        />
    );
}
