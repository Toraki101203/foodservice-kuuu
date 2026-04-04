import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { HomeClient } from "./home-client";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/landing");

  // service role で取得（RLS バイパス）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 並列クエリ: フォロー一覧・投稿・アクティブなストーリーを同時取得
  const now = new Date().toISOString();
  const [followsResult, postsResult, storiesResult] = await Promise.all([
    serviceSupabase
      .from("follows")
      .select("shop_id")
      .eq("user_id", user.id),
    serviceSupabase
      .from("instagram_posts")
      .select("*, shop:shops(*, seat_status(*))")
      .order("posted_at", { ascending: false })
      .limit(50),
    serviceSupabase
      .from("instagram_stories")
      .select("*, shop:shops(*, seat_status(*))")
      .gt("expires_at", now)
      .order("timestamp", { ascending: false }),
  ]);

  const followingIds = followsResult.data ?? [];
  const allPosts = postsResult.data ?? [];
  const allStories = storiesResult.data ?? [];
  const followingSet = new Set(followingIds.map((f) => f.shop_id));

  // フォロー中の店舗の投稿のみフィルタ
  const followingPosts = allPosts.filter((p) =>
    followingSet.has(p.shop?.id)
  );

  // ストーリーを店舗ごとにグループ化
  const storyMap = new Map<string, { shop: typeof allStories[0]["shop"]; stories: typeof allStories }>();
  for (const story of allStories) {
    if (!story.shop) continue;
    const shopId = story.shop_id;
    if (!storyMap.has(shopId)) {
      storyMap.set(shopId, { shop: story.shop, stories: [] });
    }
    storyMap.get(shopId)!.stories.push(story);
  }

  const storyItems = Array.from(storyMap.values()).map((item) => ({
    shop: item.shop,
    stories: item.stories,
    hasUnread: true,
  }));

  return (
    <HomeClient
      followingPosts={followingPosts}
      stories={storyItems}
      hasFollows={followingIds.length > 0}
    />
  );
}
