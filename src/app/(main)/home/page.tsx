import { createClient } from "@/lib/supabase/server";
import HomeFeed from "@/components/timeline/HomeFeed";
import StoryBar from "@/components/timeline/StoryBar";
import type { ShopWithStories } from "@/components/timeline/StoryBar";
import type { Database } from "@/types/database";
import type { Restaurant, Story } from "@/types/database";

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

    // アクティブなストーリーを取得（shop情報を含む）
    const { data: rawStories } = await supabase
        .from("stories")
        .select("*, shop:shops(*)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

    // shop_id でグループ化
    const shopStoriesMap = new Map<string, ShopWithStories>();
    for (const story of (rawStories || []) as (Story & { shop: Restaurant })[]) {
        if (!story.shop) continue;
        const existing = shopStoriesMap.get(story.shop.id);
        if (existing) {
            existing.stories.push(story);
        } else {
            shopStoriesMap.set(story.shop.id, {
                shop: story.shop,
                stories: [story],
            });
        }
    }

    // フォロー中の店舗を優先（ログイン時）
    let shopStories = Array.from(shopStoriesMap.values());
    if (authData?.user) {
        const { data: follows } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", authData.user.id)
            .eq("following_type", "restaurant");
        const followedIds = new Set((follows || []).map((f: any) => f.following_id));
        shopStories.sort((a, b) => {
            const aFollowed = followedIds.has(a.shop.id) ? 0 : 1;
            const bFollowed = followedIds.has(b.shop.id) ? 0 : 1;
            return aFollowed - bFollowed;
        });
    }

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
        <>
            <StoryBar shopStories={shopStories} />
            <HomeFeed
                posts={activePosts}
                initialFavoriteShopIds={initialFavoriteShopIds}
                recommendedShops={recommendedShops || []}
            />
        </>
    );
}
