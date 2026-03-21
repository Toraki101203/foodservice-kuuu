import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { scoreNearby, getPostDistance, diversifyPosts, DISTANCE_TIERS, type GenrePreferences } from "@/lib/feed-scoring";
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
 * 近くの投稿を取得（位置情報ベース）
 * GET /api/feed/nearby?lat=35.68&lng=139.76&limit=20&viewed=id1,id2&genrePrefs=ラーメン:5
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const limit = Math.min(Number(searchParams.get("limit") || 20), 50);
  const viewedPostIds = new Set(
    (searchParams.get("viewed") ?? "").split(",").filter(Boolean)
  );
  const genrePreferences = parseGenrePrefs(searchParams.get("genrePrefs") ?? "");

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "緯度・経度が必要です" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  // 投稿を取得（30日以内、店舗・空席情報付き）
  const { data: posts, error } = await supabase
    .from("instagram_posts")
    .select("*, shop:shops(*, seat_status(*))")
    .gte("posted_at", thirtyDaysAgo)
    .order("posted_at", { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json(
      { error: "投稿の取得に失敗しました" },
      { status: 500 }
    );
  }

  // トレンディングデータを並列取得
  const postIds = (posts ?? []).map((p) => p.id);
  const shopIds = [...new Set((posts ?? []).map((p) => p.shop_id))];
  const sixHoursAgo = new Date(Date.now() - 6 * 3_600_000).toISOString();

  const [recentLikesResult, recentFollowsResult] = await Promise.all([
    supabase
      .from("post_favorites")
      .select("post_id")
      .in("post_id", postIds)
      .gte("created_at", sixHoursAgo),
    supabase
      .from("follows")
      .select("shop_id")
      .in("shop_id", shopIds)
      .gte("created_at", sixHoursAgo),
  ]);

  const recentLikeMap = new Map<string, number>();
  for (const row of recentLikesResult.data ?? []) {
    recentLikeMap.set(row.post_id, (recentLikeMap.get(row.post_id) ?? 0) + 1);
  }

  const recentFollowMap = new Map<string, number>();
  for (const row of recentFollowsResult.data ?? []) {
    recentFollowMap.set(row.shop_id, (recentFollowMap.get(row.shop_id) ?? 0) + 1);
  }

  // 距離を事前計算（全投稿）
  const postsWithDist = (posts ?? []).map((post) => {
    const enriched = {
      ...post,
      _recentLikeCount: recentLikeMap.get(post.id) ?? 0,
      _recentFollowCount: recentFollowMap.get(post.shop_id) ?? 0,
    };
    const distKm = getPostDistance(enriched, lat, lng);
    return { post, enriched, distKm };
  });

  // 動的半径: 近い範囲で十分な件数があればその半径を使う
  let selectedMaxKm = DISTANCE_TIERS[DISTANCE_TIERS.length - 1].maxKm;
  for (const tier of DISTANCE_TIERS) {
    const countInRange = postsWithDist.filter(
      (p) => p.distKm != null && p.distKm <= tier.maxKm
    ).length;
    if (countInRange >= tier.minResults) {
      selectedMaxKm = tier.maxKm;
      break;
    }
  }

  // スコアリング（動的半径を適用）
  const scored = postsWithDist
    .map(({ post, enriched, distKm }) => {
      const score = scoreNearby(enriched, lat, lng, {
        viewedPostIds,
        genrePreferences,
        maxDistanceKm: selectedMaxKm,
      });
      return {
        ...post,
        _score: score,
        _distanceKm: distKm,
        _distanceLabel: distKm != null ? formatDistance(distKm) : null,
      };
    })
    .filter((p) => p._score > 0)
    .sort((a, b) => b._score - a._score);

  // 多様性制御: 同じ店舗が連続しないようにインターリーブ
  const diversified = diversifyPosts(scored).slice(0, limit);

  return NextResponse.json({ posts: diversified, _radiusKm: selectedMaxKm });
}
