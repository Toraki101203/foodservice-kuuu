import { createClient } from "@/lib/supabase/server";
import { DiscoverView } from "@/components/discover/DiscoverView";
import { LandingPage } from "@/components/landing/LandingPage";

/**
 * ルートページ（"/"）
 * - ログイン済み: 地図+リスト切替のメイン画面（DiscoverView）
 * - 未ログイン: ランディングページ
 */
export default async function RootPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  // 未ログイン時はランディングページを表示
  if (!authData?.user) {
    return <LandingPage />;
  }

  // ログイン済み: 店舗データを並列取得
  const [restaurantsResult, seatResult, instagramResult, favsResult] =
    await Promise.all([
      supabase.from("shops").select("*"),
      supabase.from("seat_status").select("*"),
      supabase
        .from("instagram_posts")
        .select("*")
        .order("posted_at", { ascending: false }),
      supabase
        .from("favorites")
        .select("restaurant_id")
        .eq("user_id", authData.user.id),
    ]);

  return (
    <DiscoverView
      restaurants={restaurantsResult.data || []}
      seatStatuses={seatResult.data || []}
      instagramPosts={instagramResult.data || []}
      initialFavoriteIds={
        (favsResult.data || []).map(
          (f: { restaurant_id: string }) => f.restaurant_id
        )
      }
    />
  );
}
