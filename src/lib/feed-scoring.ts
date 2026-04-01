/**
 * フィードスコアリング — 近く・人気タブのランキングロジック
 *
 * Phase 0: 距離 × 鮮度 × 空席ボーナス
 * Phase 1: + 時間帯最適化 + 閲覧済み減衰 + 多様性制御
 * Phase 2: + ジャンル嗜好学習 + 営業時間フィルター
 * Phase 3: + トレンディング + 新店舗ブースト + 投稿品質シグナル
 */

import { calculateDistance } from "./geo";
import type { SeatStatusType, DayHours } from "@/types/database";

// ---- 型定義 ----

type PostForScoring = {
  id: string;
  posted_at: string | null;
  shop_id: string;
  caption?: string | null;
  image_url?: string | null;
  shop: {
    latitude: number | null;
    longitude: number | null;
    genre: string | null;
    created_at?: string;
    seat_status: { status: SeatStatusType }[];
    business_hours?: {
      mon: DayHours;
      tue: DayHours;
      wed: DayHours;
      thu: DayHours;
      fri: DayHours;
      sat: DayHours;
      sun: DayHours;
    } | null;
  };
  _followerCount?: number;
  _likeCount?: number;
  _reservationCount?: number;
  _recentLikeCount?: number;
  _recentFollowCount?: number;
};

// ---- Phase 2: ジャンル嗜好スコア ----

/**
 * ユーザーのジャンルクリック履歴に基づくボーナス
 * よくクリックするジャンル: 最大1.5倍、クリックなし: 1.0
 */
export type GenrePreferences = Map<string, number>;

function genrePreferenceBonus(
  genre: string | null,
  preferences: GenrePreferences | undefined
): number {
  if (!genre || !preferences || preferences.size === 0) return 1.0;
  const count = preferences.get(genre) ?? 0;
  if (count === 0) return 1.0;
  // 最大クリック数でスケーリング（最大1.5倍）
  const maxCount = Math.max(...preferences.values());
  if (maxCount === 0) return 1.0;
  return 1.0 + 0.5 * (count / maxCount);
}

// ---- Phase 2: 営業時間フィルター ----

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/**
 * 現在営業中かどうかに基づくスコア係数
 * 営業中: 1.0、閉店日: 0.2、営業時間外: 0.4、情報なし: 1.0
 */
function businessHoursBonus(
  businessHours: PostForScoring["shop"]["business_hours"]
): number {
  if (!businessHours) return 1.0;

  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const todayHours = businessHours[dayKey];

  if (!todayHours || todayHours.closed) return 0.2;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = todayHours.open.split(":").map(Number);
  const [closeH, closeM] = todayHours.close.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  let closeMinutes = closeH * 60 + closeM;

  // 深夜営業対応（閉店が開店より前なら翌日扱い）
  if (closeMinutes <= openMinutes) closeMinutes += 24 * 60;

  const adjustedCurrent =
    currentMinutes < openMinutes && closeMinutes > 24 * 60
      ? currentMinutes + 24 * 60
      : currentMinutes;

  if (adjustedCurrent >= openMinutes && adjustedCurrent < closeMinutes) {
    return 1.0;
  }

  // 営業1時間前は少しブースト（これから開くので）
  if (adjustedCurrent >= openMinutes - 60 && adjustedCurrent < openMinutes) {
    return 0.7;
  }

  return 0.4;
}

// ---- Phase 3: トレンディングブースト ----

/**
 * 直近数時間でエンゲージメントが急増している投稿にブースト
 * いいね・フォローが直近で発生 → 「今盛り上がっている」シグナル
 * _recentLikeCount, _recentFollowCount は直近6時間の増分
 */
function trendingBoost(post: PostForScoring): number {
  const recentLikes = post._recentLikeCount ?? 0;
  const recentFollows = post._recentFollowCount ?? 0;
  const momentum = recentLikes + recentFollows * 2;

  if (momentum === 0) return 1.0;
  if (momentum >= 10) return 1.8;
  if (momentum >= 5) return 1.5;
  if (momentum >= 2) return 1.2;
  return 1.1;
}

// ---- Phase 3: 新店舗ブースト ----

/**
 * 登録から14日以内の新店舗を優遇表示
 * モグリス に新しく参加した店舗の発見を促進する
 */
const NEW_SHOP_DAYS = 14;

function newShopBoost(shopCreatedAt: string | undefined): number {
  if (!shopCreatedAt) return 1.0;
  const daysAgo = (Date.now() - new Date(shopCreatedAt).getTime()) / 86_400_000;
  if (daysAgo <= 3) return 1.6;  // 登録3日以内: 強ブースト
  if (daysAgo <= NEW_SHOP_DAYS) return 1.3; // 14日以内: 中ブースト
  return 1.0;
}

// ---- Phase 3: 投稿品質シグナル ----

/**
 * 投稿の充実度に基づくボーナス
 * - 画像あり: 基本要件
 * - キャプション充実: 50文字以上で+20%、100文字以上で+30%
 * - キャプションなし: -20%
 */
function postQualityBonus(post: PostForScoring): number {
  let score = 1.0;

  // 画像なしはペナルティ
  if (!post.image_url) {
    score *= 0.5;
  }

  // キャプションの充実度
  const captionLen = post.caption?.length ?? 0;
  if (captionLen === 0) {
    score *= 0.8;
  } else if (captionLen >= 100) {
    score *= 1.3;
  } else if (captionLen >= 50) {
    score *= 1.2;
  }

  return score;
}

// ---- 距離スコア ----

/**
 * 動的半径: 結果数に応じてスコアリング半径を拡大
 * - NEAR (5km): 都市部で十分な候補がある場合
 * - MID (15km): 郊外・地方で候補が少ない場合
 * - FAR (30km): 過疎地域のフォールバック
 *
 * distanceScore は maxKm に対する線形減衰（遠いほど低い）
 */
const DISTANCE_TIERS = [
  { maxKm: 5, minResults: 5 },   // まず5km以内で探す
  { maxKm: 15, minResults: 5 },  // 足りなければ15kmまで拡大
  { maxKm: 30, minResults: 0 },  // 最終フォールバック
] as const;

export { DISTANCE_TIERS };

function distanceScore(distanceKm: number, maxKm: number = 30): number {
  if (distanceKm >= maxKm) return 0;
  return 1 - distanceKm / maxKm;
}

// ---- 鮮度スコア ----

const FRESH_HOURS = 24;
const DECAY_DAYS = 7;
const MAX_POST_AGE_DAYS = 30;

function freshnessScore(postedAt: string | null): number {
  if (!postedAt) return 0;
  const hoursAgo = (Date.now() - new Date(postedAt).getTime()) / 3_600_000;
  if (hoursAgo <= FRESH_HOURS) return 1.0;
  const daysAgo = hoursAgo / 24;
  // 30日超えは完全に非表示（スコア0）
  if (daysAgo >= MAX_POST_AGE_DAYS) return 0;
  if (daysAgo >= DECAY_DAYS) return 0.1;
  return 1.0 - (0.9 * (daysAgo - 1)) / (DECAY_DAYS - 1);
}

// ---- 空席ボーナス ----

const SEAT_BONUS: Record<SeatStatusType, number> = {
  available: 1.5,
  busy: 1.1,
  full: 0.8,
  closed: 0.3,
};

function seatBonus(seatStatus: { status: SeatStatusType }[] | undefined): number {
  const current = seatStatus?.[0];
  if (!current) return 1.0;
  return SEAT_BONUS[current.status] ?? 1.0;
}

// ---- Phase 1: 時間帯最適化 ----

/**
 * ジャンルと現在時間帯のマッチング
 * ランチ帯（11-14時）: ランチ系ジャンルを優先
 * ディナー帯（17-22時）: 居酒屋・ディナー系を優先
 * それ以外: カフェ・スイーツ系を優先
 */
const LUNCH_GENRES = new Set([
  "ラーメン", "定食", "カレー", "そば", "うどん", "丼", "中華",
  "弁当", "ランチ", "食堂", "パスタ", "ハンバーガー",
]);

const DINNER_GENRES = new Set([
  "居酒屋", "焼肉", "焼鳥", "寿司", "鮨", "割烹", "和食",
  "イタリアン", "フレンチ", "バー", "ダイニング", "鉄板焼き",
  "しゃぶしゃぶ", "鍋", "串カツ", "おでん",
]);

const CAFE_GENRES = new Set([
  "カフェ", "喫茶", "スイーツ", "パン", "ベーカリー", "ケーキ",
]);

function timeOfDayBonus(genre: string | null): number {
  if (!genre) return 1.0;

  const hour = new Date().getHours();

  // ランチ帯 11:00-14:00
  if (hour >= 11 && hour < 14) {
    if (LUNCH_GENRES.has(genre)) return 1.4;
    if (DINNER_GENRES.has(genre)) return 0.7;
    return 1.0;
  }

  // ディナー帯 17:00-22:00
  if (hour >= 17 && hour < 22) {
    if (DINNER_GENRES.has(genre)) return 1.4;
    if (LUNCH_GENRES.has(genre)) return 0.7;
    return 1.0;
  }

  // カフェタイム 14:00-17:00
  if (hour >= 14 && hour < 17) {
    if (CAFE_GENRES.has(genre)) return 1.3;
    return 1.0;
  }

  // 深夜・早朝（22:00-11:00）
  return 1.0;
}

// ---- Phase 1: 閲覧済み減衰 ----

/**
 * 閲覧済み投稿のスコアを下げる
 * 未閲覧: 1.0、閲覧済み: 0.3
 */
function viewedDecay(postId: string, viewedPostIds: Set<string>): number {
  return viewedPostIds.has(postId) ? 0.3 : 1.0;
}

// ---- Phase 1: 多様性制御 ----

/**
 * スコア順にソートした後、同じ店舗が連続しないようにインターリーブ
 * 同じ店舗の投稿は最低2つ間隔を空ける
 */
export function diversifyPosts<T extends { shop_id: string }>(posts: T[]): T[] {
  if (posts.length <= 2) return posts;

  const result: T[] = [];
  const remaining = [...posts];
  const recentShops: string[] = [];
  const MIN_GAP = 2;

  while (remaining.length > 0) {
    // 直近に表示されていない店舗の投稿を探す
    const idx = remaining.findIndex(
      (p) => !recentShops.includes(p.shop_id)
    );

    if (idx >= 0) {
      const post = remaining.splice(idx, 1)[0];
      result.push(post);
      recentShops.push(post.shop_id);
      if (recentShops.length > MIN_GAP) recentShops.shift();
    } else {
      // すべて最近表示済みの場合はそのまま追加
      result.push(remaining.shift()!);
    }
  }

  return result;
}

// ---- 公開スコアリング関数 ----
// Phase 2: ジャンル嗜好 + 営業時間フィルターが追加済み

// ---- スコアリングオプション ----

type ScoringOptions = {
  viewedPostIds?: Set<string>;
  genrePreferences?: GenrePreferences;
  maxDistanceKm?: number;
};

/**
 * 「近く」タブ用スコア計算
 * 距離 × 鮮度 × 空席 × 時間帯 × 閲覧済み × ジャンル嗜好 × 営業時間
 * × トレンディング × 新店舗 × 投稿品質
 */
export function scoreNearby(
  post: PostForScoring,
  userLat: number,
  userLng: number,
  viewedPostIdsOrOptions?: Set<string> | ScoringOptions
): number {
  const opts = parseScoringOptions(viewedPostIdsOrOptions);
  const shopLat = post.shop.latitude;
  const shopLng = post.shop.longitude;
  if (shopLat == null || shopLng == null) return 0;

  const dist = calculateDistance(userLat, userLng, shopLat, shopLng);
  const maxKm = opts.maxDistanceKm ?? 30;
  return (
    distanceScore(dist, maxKm) *
    freshnessScore(post.posted_at) *
    seatBonus(post.shop.seat_status) *
    timeOfDayBonus(post.shop.genre) *
    viewedDecay(post.id, opts.viewedPostIds ?? new Set()) *
    genrePreferenceBonus(post.shop.genre, opts.genrePreferences) *
    businessHoursBonus(post.shop.business_hours) *
    trendingBoost(post) *
    newShopBoost(post.shop.created_at) *
    postQualityBonus(post)
  );
}

/**
 * 「人気」タブ用スコア計算
 * エンゲージメント × 鮮度 × 距離減衰 × 時間帯 × 閲覧済み × ジャンル嗜好 × 営業時間
 * × トレンディング × 新店舗 × 投稿品質
 */
export function scorePopular(
  post: PostForScoring,
  userLat: number | null,
  userLng: number | null,
  viewedPostIdsOrOptions?: Set<string> | ScoringOptions
): number {
  const opts = parseScoringOptions(viewedPostIdsOrOptions);
  const followers = post._followerCount ?? 0;
  const likes = post._likeCount ?? 0;
  const reservations = post._reservationCount ?? 0;

  const engagement = followers * 2 + likes + reservations * 3;

  let distDecay = 1.0;
  if (userLat != null && userLng != null) {
    const shopLat = post.shop.latitude;
    const shopLng = post.shop.longitude;
    if (shopLat != null && shopLng != null) {
      const dist = calculateDistance(userLat, userLng, shopLat, shopLng);
      distDecay = dist <= 10 ? 1.0 : Math.max(0.3, 1 - (dist - 10) / 50);
    }
  }

  return (
    engagement *
    freshnessScore(post.posted_at) *
    distDecay *
    timeOfDayBonus(post.shop.genre) *
    viewedDecay(post.id, opts.viewedPostIds ?? new Set()) *
    genrePreferenceBonus(post.shop.genre, opts.genrePreferences) *
    businessHoursBonus(post.shop.business_hours) *
    trendingBoost(post) *
    newShopBoost(post.shop.created_at) *
    postQualityBonus(post)
  );
}

/**
 * 後方互換: Set<string> でも ScoringOptions でも受け付ける
 */
function parseScoringOptions(
  input?: Set<string> | ScoringOptions
): ScoringOptions {
  if (!input) return {};
  if (input instanceof Set) return { viewedPostIds: input };
  return input;
}

/**
 * 投稿までの距離を取得（km）
 */
export function getPostDistance(
  post: PostForScoring,
  userLat: number,
  userLng: number
): number | null {
  const shopLat = post.shop.latitude;
  const shopLng = post.shop.longitude;
  if (shopLat == null || shopLng == null) return null;
  return calculateDistance(userLat, userLng, shopLat, shopLng);
}
