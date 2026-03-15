import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HomeClient } from "./home-client";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/landing");

  // 並列クエリ: フォロー一覧・投稿・ストーリー・お気に入りを同時取得
  const [
    { data: followingIds },
    { data: nearbyPosts },
    { data: popularPosts },
    { data: stories },
    { data: favoriteIds },
  ] = await Promise.all([
    supabase
      .from("follows")
      .select("shop_id")
      .eq("user_id", user.id),
    supabase
      .from("instagram_posts")
      .select("*, shop:shops(*, seat_status(*))")
      .order("posted_at", { ascending: false })
      .limit(20),
    supabase
      .from("instagram_posts")
      .select("*, shop:shops(*, seat_status(*))")
      .order("posted_at", { ascending: false })
      .limit(20),
    supabase
      .from("instagram_stories")
      .select("*, shop:shops(*, seat_status(*))")
      .gt("expires_at", new Date().toISOString())
      .order("timestamp", { ascending: false }),
    supabase
      .from("favorites")
      .select("shop_id")
      .eq("user_id", user.id),
  ]);

  const followingShopIds = (followingIds ?? []).map((f) => f.shop_id);
  const followingSet = new Set(followingShopIds);

  // フォロー中の店舗の投稿をフィルタリング
  const followingPosts = (nearbyPosts ?? []).filter((p) =>
    followingSet.has(p.shop?.id)
  );

  // ストーリーを店舗ごとにグループ化
  type StoryRow = NonNullable<typeof stories>[number];
  const storyMap = new Map<string, StoryRow[]>();
  for (const story of stories ?? []) {
    const shopId = story.shop?.id;
    if (!shopId) continue;
    if (!storyMap.has(shopId)) storyMap.set(shopId, []);
    storyMap.get(shopId)!.push(story);
  }

  const groupedStories = Array.from(storyMap.entries()).map(([, shopStories]) => ({
    shop: shopStories[0].shop,
    stories: shopStories,
    hasUnread: true,
  }));

  const favShopIds = (favoriteIds ?? []).map((f) => f.shop_id);

  return (
    <HomeClient
      followingPosts={followingPosts}
      nearbyPosts={nearbyPosts ?? []}
      popularPosts={popularPosts ?? []}
      stories={groupedStories}
      favoriteShopIds={favShopIds}
      followingShopIds={followingShopIds}
    />
  );
}
