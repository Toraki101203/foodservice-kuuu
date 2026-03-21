import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { scorePopular, getPostDistance, diversifyPosts, type GenrePreferences } from "@/lib/feed-scoring";
import { formatDistance } from "@/lib/geo";

/** "ラーメン:5,カフェ:3" → Map<string, number> */
function parseGenrePrefs(param: string): GenrePreferences {
  const map = new Map<string, number>();
  if (!param) return map;
  for (const entry of param.split(",")) {
    const [genre, countStr] = entry.split(":");
    if (genre && countStr) map.set(genre, Number(countStr) || 0);
  }
  return map;
}

/**
 * 人気の投稿を取得（エンゲージメントベース）
 * GET /api/feed/popular?lat=35.68&lng=139.76&limit=20&viewed=id1,id2&genrePrefs=ラーメン:5
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : null;
  const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : null;
  const limit = Math.min(Number(searchParams.get("limit") || 20), 50);
  const viewedPostIds = new Set(
    (searchParams.get("viewed") ?? "").split(",").filter(Boolean)
  );
  const genrePreferences = parseGenrePrefs(searchParams.get("genrePrefs") ?? "");

  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  // 投稿 + 店舗データ取得（30日以内）
  const { data: posts, error } = await supabase
    .from("instagram_posts")
    .select("*, shop:shops(*, seat_status(*))")
    .gte("posted_at", thirtyDaysAgo)
    .order("posted_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { error: "投稿の取得に失敗しました" },
      { status: 500 }
    );
  }

  // 各店舗のフォロワー数 + トレンディングデータを並列取得
  const shopIds = [...new Set((posts ?? []).map((p) => p.shop_id))];
  const postIds = (posts ?? []).map((p) => p.id);
  const sixHoursAgo = new Date(Date.now() - 6 * 3_600_000).toISOString();

  const [allFollowsResult, recentLikesResult, recentFollowsResult] = await Promise.all([
    // フォロワー数（1クエリで全店舗分を取得 → JS側で集計）
    supabase
      .from("follows")
      .select("shop_id")
      .in("shop_id", shopIds),
    // 直近6時間のいいね数（投稿別）
    supabase
      .from("post_favorites")
      .select("post_id")
      .in("post_id", postIds)
      .gte("created_at", sixHoursAgo),
    // 直近6時間のフォロー数（店舗別）
    supabase
      .from("follows")
      .select("shop_id")
      .in("shop_id", shopIds)
      .gte("created_at", sixHoursAgo),
  ]);

  const followerMap = new Map<string, number>();
  for (const row of allFollowsResult.data ?? []) {
    followerMap.set(row.shop_id, (followerMap.get(row.shop_id) ?? 0) + 1);
  }

  // 直近いいね数を投稿IDごとに集計
  const recentLikeMap = new Map<string, number>();
  for (const row of recentLikesResult.data ?? []) {
    recentLikeMap.set(row.post_id, (recentLikeMap.get(row.post_id) ?? 0) + 1);
  }

  // 直近フォロー数を店舗IDごとに集計
  const recentFollowMap = new Map<string, number>();
  for (const row of recentFollowsResult.data ?? []) {
    recentFollowMap.set(row.shop_id, (recentFollowMap.get(row.shop_id) ?? 0) + 1);
  }

  // スコアリング
  const scored = (posts ?? [])
    .map((post) => {
      const enriched = {
        ...post,
        shop: {
          ...post.shop,
          latitude: post.shop?.latitude ?? null,
          longitude: post.shop?.longitude ?? null,
          seat_status: post.shop?.seat_status ?? [],
        },
        _followerCount: followerMap.get(post.shop_id) ?? 0,
        _likeCount: 0,
        _reservationCount: 0,
        _recentLikeCount: recentLikeMap.get(post.id) ?? 0,
        _recentFollowCount: recentFollowMap.get(post.shop_id) ?? 0,
      };
      const score = scorePopular(enriched, lat, lng, { viewedPostIds, genrePreferences });
      const distKm =
        lat != null && lng != null
          ? getPostDistance(enriched, lat, lng)
          : null;
      return {
        ...post,
        _score: score,
        _distanceKm: distKm,
        _distanceLabel: distKm != null ? formatDistance(distKm) : null,
      };
    })
    .sort((a, b) => b._score - a._score);

  // 多様性制御: 同じ店舗が連続しないようにインターリーブ
  const diversified = diversifyPosts(scored).slice(0, limit);

  return NextResponse.json({ posts: diversified });
}
