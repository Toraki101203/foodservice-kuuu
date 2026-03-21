import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HomeClient } from "./home-client";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/landing");

  // 並列クエリ: フォロー一覧・フォロー中投稿を取得
  const [followsResult, postsResult] = await Promise.all([
    supabase
      .from("follows")
      .select("shop_id")
      .eq("user_id", user.id),
    supabase
      .from("instagram_posts")
      .select("*, shop:shops(*, seat_status(*))")
      .order("posted_at", { ascending: false })
      .limit(50),
  ]);

  const followingIds = followsResult.data ?? [];
  const allPosts = postsResult.data ?? [];
  const followingSet = new Set(followingIds.map((f) => f.shop_id));

  // フォロー中の店舗の投稿のみフィルタ
  const followingPosts = allPosts.filter((p) =>
    followingSet.has(p.shop?.id)
  );

  return (
    <HomeClient
      followingPosts={followingPosts}
      stories={[]}
      hasFollows={followingIds.length > 0}
    />
  );
}
