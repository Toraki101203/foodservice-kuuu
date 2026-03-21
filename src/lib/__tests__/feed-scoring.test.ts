/**
 * フィードスコアリング アルゴリズムテスト
 *
 * 10要素すべてが正しく動作することを検証:
 * Phase 0: 距離、鮮度、空席ボーナス
 * Phase 1: 時間帯最適化、閲覧済み減衰、多様性制御
 * Phase 2: ジャンル嗜好学習、営業時間フィルター
 * Phase 3: トレンディング、新店舗ブースト、投稿品質
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  scoreNearby,
  scorePopular,
  diversifyPosts,
  getPostDistance,
  DISTANCE_TIERS,
} from "../feed-scoring";

// ---- テスト用ヘルパー ----

/** 基本的な投稿データを生成 */
function makePost(overrides: Record<string, unknown> = {}) {
  const base = {
    id: "post-1",
    posted_at: new Date().toISOString(), // 新鮮な投稿
    shop_id: "shop-1",
    caption: "美味しいラーメンです！本日のおすすめは味噌ラーメン。ぜひお越しください。", // 50文字+
    image_url: "https://example.com/image.jpg",
    shop: {
      latitude: 35.6812,  // 東京駅付近
      longitude: 139.7671,
      genre: "ラーメン",
      created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(), // 30日前
      seat_status: [{ status: "available" as const }],
      business_hours: null,
    },
    _followerCount: 10,
    _likeCount: 5,
    _reservationCount: 2,
    _recentLikeCount: 0,
    _recentFollowCount: 0,
  };

  // shop のオーバーライドはマージ
  if (overrides.shop) {
    return {
      ...base,
      ...overrides,
      shop: { ...base.shop, ...(overrides.shop as Record<string, unknown>) },
    };
  }
  return { ...base, ...overrides };
}

// 東京駅の座標（テスト用ユーザー位置）
const USER_LAT = 35.6812;
const USER_LNG = 139.7671;

// ============================================================
// Phase 0: 距離スコア
// ============================================================

describe("Phase 0: 距離スコア", () => {
  it("同じ位置の店舗は最高スコアになる", () => {
    const post = makePost({
      shop: { latitude: USER_LAT, longitude: USER_LNG },
    });
    const score = scoreNearby(post, USER_LAT, USER_LNG);
    expect(score).toBeGreaterThan(0);
  });

  it("最大半径（30km）以上離れた店舗はスコア0になる", () => {
    // 約35km北
    const post = makePost({
      shop: { latitude: USER_LAT + 0.32, longitude: USER_LNG },
    });
    const score = scoreNearby(post, USER_LAT, USER_LNG);
    expect(score).toBe(0);
  });

  it("maxDistanceKm を指定すると、その距離以上でスコア0になる", () => {
    // 約10km北
    const post = makePost({
      shop: { latitude: USER_LAT + 0.09, longitude: USER_LNG },
    });
    const score = scoreNearby(post, USER_LAT, USER_LNG, { maxDistanceKm: 5 });
    expect(score).toBe(0);
  });

  it("近い店舗のほうが遠い店舗よりスコアが高い", () => {
    const close = makePost({
      id: "close",
      shop: { latitude: USER_LAT + 0.005, longitude: USER_LNG }, // ~500m
    });
    const far = makePost({
      id: "far",
      shop: { latitude: USER_LAT + 0.03, longitude: USER_LNG }, // ~3.3km
    });
    const closeScore = scoreNearby(close, USER_LAT, USER_LNG);
    const farScore = scoreNearby(far, USER_LAT, USER_LNG);
    expect(closeScore).toBeGreaterThan(farScore);
  });

  it("緯度経度がnullの店舗はスコア0になる", () => {
    const post = makePost({
      shop: { latitude: null, longitude: null },
    });
    expect(scoreNearby(post, USER_LAT, USER_LNG)).toBe(0);
  });

  it("getPostDistance が正しい距離を返す", () => {
    const post = makePost({
      shop: { latitude: USER_LAT, longitude: USER_LNG },
    });
    const dist = getPostDistance(post, USER_LAT, USER_LNG);
    expect(dist).toBe(0);
  });

  it("getPostDistance は座標なしで null を返す", () => {
    const post = makePost({
      shop: { latitude: null, longitude: null },
    });
    expect(getPostDistance(post, USER_LAT, USER_LNG)).toBeNull();
  });
});

// ============================================================
// Phase 0: 鮮度スコア
// ============================================================

describe("Phase 0: 鮮度スコア", () => {
  it("投稿直後（24h以内）は鮮度が最大", () => {
    const fresh = makePost({ posted_at: new Date().toISOString() });
    const old = makePost({
      posted_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    });
    expect(scoreNearby(fresh, USER_LAT, USER_LNG)).toBeGreaterThan(
      scoreNearby(old, USER_LAT, USER_LNG)
    );
  });

  it("7日以上前の投稿は鮮度が最低（0.1）", () => {
    const veryOld = makePost({
      posted_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    });
    const recent = makePost({ posted_at: new Date().toISOString() });

    const oldScore = scoreNearby(veryOld, USER_LAT, USER_LNG);
    const recentScore = scoreNearby(recent, USER_LAT, USER_LNG);
    // 7日超えの鮮度は0.1なので、スコア比は約10倍
    expect(recentScore / oldScore).toBeGreaterThan(5);
  });

  it("posted_at が null の場合、スコアは0（非表示）", () => {
    const nullPost = makePost({ posted_at: null });
    expect(scoreNearby(nullPost, USER_LAT, USER_LNG)).toBe(0);
  });

  it("30日超えの投稿はスコア0（完全に非表示）", () => {
    const expiredPost = makePost({
      posted_at: new Date(Date.now() - 31 * 86_400_000).toISOString(),
    });
    expect(scoreNearby(expiredPost, USER_LAT, USER_LNG)).toBe(0);
  });

  it("29日前の投稿はまだ表示される", () => {
    const almostExpired = makePost({
      posted_at: new Date(Date.now() - 29 * 86_400_000).toISOString(),
    });
    expect(scoreNearby(almostExpired, USER_LAT, USER_LNG)).toBeGreaterThan(0);
  });
});

// ============================================================
// Phase 0: 空席ボーナス
// ============================================================

describe("Phase 0: 空席ボーナス", () => {
  it("available > busy > full > closed の順でスコアが高い", () => {
    const statuses = ["available", "busy", "full", "closed"] as const;
    const scores = statuses.map((status) => {
      const post = makePost({
        shop: { seat_status: [{ status }] },
      });
      return scoreNearby(post, USER_LAT, USER_LNG);
    });

    expect(scores[0]).toBeGreaterThan(scores[1]); // available > busy
    expect(scores[1]).toBeGreaterThan(scores[2]); // busy > full
    expect(scores[2]).toBeGreaterThan(scores[3]); // full > closed
  });

  it("空席情報なしはスコアに影響しない（1.0倍）", () => {
    const withStatus = makePost({
      shop: { seat_status: [{ status: "available" }] },
    });
    const noStatus = makePost({
      shop: { seat_status: [] },
    });
    // available=1.5倍 vs なし=1.0倍 → available のほうが高い
    expect(scoreNearby(withStatus, USER_LAT, USER_LNG)).toBeGreaterThan(
      scoreNearby(noStatus, USER_LAT, USER_LNG)
    );
  });
});

// ============================================================
// Phase 1: 時間帯最適化
// ============================================================

describe("Phase 1: 時間帯最適化", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ランチ帯（12時）にラーメンが優遇される", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T12:00:00+09:00"));

    const ramen = makePost({ id: "ramen", shop: { genre: "ラーメン" } });
    const izakaya = makePost({ id: "izakaya", shop: { genre: "居酒屋" } });

    const ramenScore = scoreNearby(ramen, USER_LAT, USER_LNG);
    const izakayaScore = scoreNearby(izakaya, USER_LAT, USER_LNG);

    expect(ramenScore).toBeGreaterThan(izakayaScore);
  });

  it("ディナー帯（19時）に居酒屋が優遇される", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T19:00:00+09:00"));

    const ramen = makePost({ id: "ramen", shop: { genre: "ラーメン" } });
    const izakaya = makePost({ id: "izakaya", shop: { genre: "居酒屋" } });

    const ramenScore = scoreNearby(ramen, USER_LAT, USER_LNG);
    const izakayaScore = scoreNearby(izakaya, USER_LAT, USER_LNG);

    expect(izakayaScore).toBeGreaterThan(ramenScore);
  });

  it("カフェタイム（15時）にカフェが優遇される", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T15:00:00+09:00"));

    const cafe = makePost({ id: "cafe", shop: { genre: "カフェ" } });
    const ramen = makePost({ id: "ramen", shop: { genre: "ラーメン" } });

    const cafeScore = scoreNearby(cafe, USER_LAT, USER_LNG);
    const ramenScore = scoreNearby(ramen, USER_LAT, USER_LNG);

    expect(cafeScore).toBeGreaterThan(ramenScore);
  });

  it("ジャンルがnullでもエラーにならない", () => {
    const post = makePost({ shop: { genre: null } });
    expect(() => scoreNearby(post, USER_LAT, USER_LNG)).not.toThrow();
  });
});

// ============================================================
// Phase 1: 閲覧済み減衰
// ============================================================

describe("Phase 1: 閲覧済み減衰", () => {
  it("閲覧済み投稿はスコアが0.3倍に減衰する", () => {
    const post = makePost({ id: "viewed-post" });
    const viewedIds = new Set(["viewed-post"]);

    const normalScore = scoreNearby(post, USER_LAT, USER_LNG);
    const viewedScore = scoreNearby(post, USER_LAT, USER_LNG, {
      viewedPostIds: viewedIds,
    });

    expect(viewedScore).toBeCloseTo(normalScore * 0.3, 5);
  });

  it("未閲覧投稿はスコアに影響しない", () => {
    const post = makePost({ id: "unviewed-post" });
    const viewedIds = new Set(["other-post"]);

    const normalScore = scoreNearby(post, USER_LAT, USER_LNG);
    const withViewedScore = scoreNearby(post, USER_LAT, USER_LNG, {
      viewedPostIds: viewedIds,
    });

    expect(withViewedScore).toBeCloseTo(normalScore, 5);
  });

  it("Set<string> でも ScoringOptions でも受け付ける（後方互換）", () => {
    const post = makePost({ id: "test-post" });
    const viewed = new Set(["test-post"]);

    const scoreWithSet = scoreNearby(post, USER_LAT, USER_LNG, viewed);
    const scoreWithOpts = scoreNearby(post, USER_LAT, USER_LNG, {
      viewedPostIds: viewed,
    });

    expect(scoreWithSet).toBeCloseTo(scoreWithOpts, 5);
  });
});

// ============================================================
// Phase 1: 多様性制御
// ============================================================

describe("Phase 1: 多様性制御 (diversifyPosts)", () => {
  it("同じ店舗の投稿が連続しないようにインターリーブする", () => {
    const posts = [
      { shop_id: "A", id: "1" },
      { shop_id: "A", id: "2" },
      { shop_id: "A", id: "3" },
      { shop_id: "B", id: "4" },
      { shop_id: "B", id: "5" },
      { shop_id: "C", id: "6" },
    ];

    const result = diversifyPosts(posts);

    // 隣接する投稿が同じ店舗でないことを確認
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i].shop_id === result[i + 1].shop_id) {
        // 同じ店舗が連続するのは、他に選択肢がない場合のみ許容
        const otherShops = result
          .slice(i + 1)
          .filter((p) => p.shop_id !== result[i].shop_id);
        expect(otherShops.length).toBe(0);
      }
    }
  });

  it("2件以下はそのまま返す", () => {
    const posts = [
      { shop_id: "A", id: "1" },
      { shop_id: "A", id: "2" },
    ];
    expect(diversifyPosts(posts)).toEqual(posts);
  });

  it("空配列はそのまま返す", () => {
    expect(diversifyPosts([])).toEqual([]);
  });

  it("全投稿数が保持される", () => {
    const posts = Array.from({ length: 10 }, (_, i) => ({
      shop_id: `shop-${i % 3}`,
      id: `post-${i}`,
    }));
    expect(diversifyPosts(posts)).toHaveLength(10);
  });
});

// ============================================================
// Phase 2: ジャンル嗜好学習
// ============================================================

describe("Phase 2: ジャンル嗜好学習", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("よくクリックするジャンルのスコアが上がる", () => {
    // 時間帯ボーナスを排除するため深夜に固定（全ジャンル1.0倍）
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T23:00:00+09:00"));

    const prefs = new Map([
      ["ラーメン", 10],
      ["カフェ", 3],
    ]);

    const ramen = makePost({ id: "r", shop: { genre: "ラーメン" } });
    const cafe = makePost({ id: "c", shop: { genre: "カフェ" } });

    const ramenScore = scoreNearby(ramen, USER_LAT, USER_LNG, {
      genrePreferences: prefs,
    });
    const cafeScore = scoreNearby(cafe, USER_LAT, USER_LNG, {
      genrePreferences: prefs,
    });

    // ラーメン（max count）= 1.5倍、カフェ（3/10）= 1.15倍
    expect(ramenScore).toBeGreaterThan(cafeScore);
  });

  it("嗜好データなしではスコアに影響しない", () => {
    const post = makePost();
    const withPrefs = scoreNearby(post, USER_LAT, USER_LNG, {
      genrePreferences: new Map(),
    });
    const without = scoreNearby(post, USER_LAT, USER_LNG);
    expect(withPrefs).toBeCloseTo(without, 5);
  });

  it("嗜好に含まれないジャンルは1.0倍", () => {
    const prefs = new Map([["ラーメン", 10]]);
    const sushi = makePost({ shop: { genre: "寿司" } });

    const withPrefs = scoreNearby(sushi, USER_LAT, USER_LNG, {
      genrePreferences: prefs,
    });
    const without = scoreNearby(sushi, USER_LAT, USER_LNG);
    expect(withPrefs).toBeCloseTo(without, 5);
  });
});

// ============================================================
// Phase 2: 営業時間フィルター
// ============================================================

describe("Phase 2: 営業時間フィルター", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeBusinessHours(
    open: string,
    close: string,
    closed = false
  ) {
    const day = { open, close, closed };
    return { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day };
  }

  it("営業中の店舗はスコアに影響なし（1.0倍）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T12:00:00+09:00")); // 火曜12時

    const open = makePost({
      shop: { business_hours: makeBusinessHours("10:00", "22:00") },
    });
    const noHours = makePost({
      shop: { business_hours: null },
    });

    // 営業中=1.0倍、情報なし=1.0倍 → 同じ
    const openScore = scoreNearby(open, USER_LAT, USER_LNG);
    const noHoursScore = scoreNearby(noHours, USER_LAT, USER_LNG);
    expect(openScore).toBeCloseTo(noHoursScore, 5);
  });

  it("定休日の店舗はスコアが大幅に下がる（0.2倍）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T12:00:00+09:00")); // 火曜

    const closedDay = makeBusinessHours("10:00", "22:00", true);
    const post = makePost({
      shop: { business_hours: closedDay },
    });
    const normalPost = makePost({
      shop: { business_hours: null },
    });

    const closedScore = scoreNearby(post, USER_LAT, USER_LNG);
    const normalScore = scoreNearby(normalPost, USER_LAT, USER_LNG);
    expect(closedScore).toBeCloseTo(normalScore * 0.2, 1);
  });

  it("営業時間外の店舗はスコアが下がる（0.4倍）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T08:00:00+09:00")); // 火曜8時

    const post = makePost({
      shop: { business_hours: makeBusinessHours("11:00", "22:00") },
    });
    const normalPost = makePost({
      shop: { business_hours: null },
    });

    const outsideScore = scoreNearby(post, USER_LAT, USER_LNG);
    const normalScore = scoreNearby(normalPost, USER_LAT, USER_LNG);
    // 8時は11時開店の3時間前 → 0.4倍
    expect(outsideScore).toBeCloseTo(normalScore * 0.4, 1);
  });

  it("開店1時間前はやや下がる（0.7倍）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T10:30:00+09:00")); // 火曜10:30

    const post = makePost({
      shop: { business_hours: makeBusinessHours("11:00", "22:00") },
    });
    const normalPost = makePost({
      shop: { business_hours: null },
    });

    const preOpenScore = scoreNearby(post, USER_LAT, USER_LNG);
    const normalScore = scoreNearby(normalPost, USER_LAT, USER_LNG);
    expect(preOpenScore).toBeCloseTo(normalScore * 0.7, 1);
  });

  it("営業時間情報がnullならスコアに影響しない", () => {
    const post = makePost({ shop: { business_hours: null } });
    expect(() => scoreNearby(post, USER_LAT, USER_LNG)).not.toThrow();
  });
});

// ============================================================
// Phase 3: トレンディングブースト
// ============================================================

describe("Phase 3: トレンディングブースト", () => {
  it("勢いのある投稿ほどスコアが高い", () => {
    const trending = makePost({
      id: "trending",
      _recentLikeCount: 10,
      _recentFollowCount: 5,
    });
    const normal = makePost({
      id: "normal",
      _recentLikeCount: 0,
      _recentFollowCount: 0,
    });

    const trendingScore = scoreNearby(trending, USER_LAT, USER_LNG);
    const normalScore = scoreNearby(normal, USER_LAT, USER_LNG);

    // momentum = 10 + 5*2 = 20 → 1.8倍
    expect(trendingScore / normalScore).toBeCloseTo(1.8, 1);
  });

  it("momentum=0 の投稿はブーストなし（1.0倍）", () => {
    const post = makePost({
      _recentLikeCount: 0,
      _recentFollowCount: 0,
    });
    const basePost = makePost();

    expect(scoreNearby(post, USER_LAT, USER_LNG)).toBeCloseTo(
      scoreNearby(basePost, USER_LAT, USER_LNG),
      5
    );
  });
});

// ============================================================
// Phase 3: 新店舗ブースト
// ============================================================

describe("Phase 3: 新店舗ブースト", () => {
  it("登録3日以内の店舗は1.6倍ブースト", () => {
    const newShop = makePost({
      id: "new",
      shop: {
        created_at: new Date(Date.now() - 1 * 86_400_000).toISOString(), // 1日前
      },
    });
    const oldShop = makePost({
      id: "old",
      shop: {
        created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(), // 30日前
      },
    });

    const newScore = scoreNearby(newShop, USER_LAT, USER_LNG);
    const oldScore = scoreNearby(oldShop, USER_LAT, USER_LNG);

    expect(newScore / oldScore).toBeCloseTo(1.6, 1);
  });

  it("登録14日以内の店舗は1.3倍ブースト", () => {
    const recentShop = makePost({
      id: "recent",
      shop: {
        created_at: new Date(Date.now() - 10 * 86_400_000).toISOString(), // 10日前
      },
    });
    const oldShop = makePost({
      id: "old",
      shop: {
        created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(), // 30日前
      },
    });

    const recentScore = scoreNearby(recentShop, USER_LAT, USER_LNG);
    const oldScore = scoreNearby(oldShop, USER_LAT, USER_LNG);

    expect(recentScore / oldScore).toBeCloseTo(1.3, 1);
  });

  it("created_at がない場合はブーストなし", () => {
    const post = makePost({ shop: { created_at: undefined } });
    expect(() => scoreNearby(post, USER_LAT, USER_LNG)).not.toThrow();
  });
});

// ============================================================
// Phase 3: 投稿品質シグナル
// ============================================================

describe("Phase 3: 投稿品質シグナル", () => {
  it("画像なしの投稿はスコアが0.5倍に下がる", () => {
    const withImage = makePost({ id: "img", image_url: "https://example.com/img.jpg" });
    const noImage = makePost({ id: "noimg", image_url: null });

    const imgScore = scoreNearby(withImage, USER_LAT, USER_LNG);
    const noImgScore = scoreNearby(noImage, USER_LAT, USER_LNG);

    expect(imgScore / noImgScore).toBeGreaterThan(1.5);
  });

  it("長いキャプション（100文字+）は1.3倍ブースト", () => {
    const longCaption = makePost({
      id: "long",
      caption: "あ".repeat(120),
    });
    const shortCaption = makePost({
      id: "short",
      caption: "あ".repeat(30),
    });

    const longScore = scoreNearby(longCaption, USER_LAT, USER_LNG);
    const shortScore = scoreNearby(shortCaption, USER_LAT, USER_LNG);

    expect(longScore).toBeGreaterThan(shortScore);
  });

  it("キャプションなしはスコアが0.8倍に下がる", () => {
    const withCaption = makePost({
      id: "cap",
      caption: "あ".repeat(30), // 30文字（ボーナスなし、ペナルティもなし）
    });
    const noCaption = makePost({ id: "nocap", caption: null });

    const capScore = scoreNearby(withCaption, USER_LAT, USER_LNG);
    const noCapScore = scoreNearby(noCaption, USER_LAT, USER_LNG);

    expect(capScore).toBeGreaterThan(noCapScore);
  });
});

// ============================================================
// 人気タブ (scorePopular) テスト
// ============================================================

describe("人気タブ (scorePopular)", () => {
  it("エンゲージメントが高い投稿ほどスコアが高い", () => {
    const popular = makePost({
      id: "popular",
      _followerCount: 100,
      _likeCount: 50,
      _reservationCount: 20,
    });
    const unpopular = makePost({
      id: "unpopular",
      _followerCount: 1,
      _likeCount: 0,
      _reservationCount: 0,
    });

    const popScore = scorePopular(popular, USER_LAT, USER_LNG);
    const unpopScore = scorePopular(unpopular, USER_LAT, USER_LNG);

    expect(popScore).toBeGreaterThan(unpopScore);
  });

  it("エンゲージメント計算式: followers*2 + likes + reservations*3", () => {
    const post = makePost({
      _followerCount: 10,  // 20
      _likeCount: 5,       // 5
      _reservationCount: 2, // 6
    });
    // engagement = 20 + 5 + 6 = 31

    const post2 = makePost({
      id: "post-2",
      _followerCount: 5,   // 10
      _likeCount: 10,      // 10
      _reservationCount: 1, // 3
    });
    // engagement = 10 + 10 + 3 = 23

    const score1 = scorePopular(post, USER_LAT, USER_LNG);
    const score2 = scorePopular(post2, USER_LAT, USER_LNG);

    expect(score1).toBeGreaterThan(score2);
  });

  it("位置情報なしでも動作する", () => {
    const post = makePost({ _followerCount: 10 });
    const score = scorePopular(post, null, null);
    expect(score).toBeGreaterThan(0);
  });

  it("10km以内の距離は減衰しない", () => {
    const post = makePost({
      shop: { latitude: USER_LAT + 0.05, longitude: USER_LNG }, // ~5.5km
    });
    const scoreWithLoc = scorePopular(post, USER_LAT, USER_LNG);
    const scoreNoLoc = scorePopular(post, null, null);

    // 10km以内なので distDecay=1.0 → 位置なしと同じ
    expect(scoreWithLoc).toBeCloseTo(scoreNoLoc, 0);
  });

  it("遠距離（10km+）は減衰する", () => {
    const farPost = makePost({
      shop: { latitude: USER_LAT + 0.2, longitude: USER_LNG }, // ~22km
    });
    const closePost = makePost({
      id: "close",
      shop: { latitude: USER_LAT + 0.01, longitude: USER_LNG }, // ~1km
    });

    const farScore = scorePopular(farPost, USER_LAT, USER_LNG);
    const closeScore = scorePopular(closePost, USER_LAT, USER_LNG);

    expect(closeScore).toBeGreaterThan(farScore);
  });
});

// ============================================================
// 統合テスト: スコアリングの全要素が組み合わさる
// ============================================================

describe("統合テスト", () => {
  it("すべての要素が正のスコアを生成する（基本ケース）", () => {
    const post = makePost();
    const score = scoreNearby(post, USER_LAT, USER_LNG);
    expect(score).toBeGreaterThan(0);
    expect(Number.isFinite(score)).toBe(true);
  });

  it("すべてのオプションを同時に指定できる", () => {
    const post = makePost();
    const score = scoreNearby(post, USER_LAT, USER_LNG, {
      viewedPostIds: new Set(["other"]),
      genrePreferences: new Map([["ラーメン", 5]]),
    });
    expect(score).toBeGreaterThan(0);
  });

  it("最悪条件でもスコアが0以上", () => {
    const worstPost = makePost({
      posted_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
      caption: null,
      image_url: null,
      shop: {
        latitude: USER_LAT + 0.04, // 約4.4km
        longitude: USER_LNG,
        genre: null,
        seat_status: [{ status: "closed" as const }],
      },
      _recentLikeCount: 0,
      _recentFollowCount: 0,
    });

    const score = scoreNearby(worstPost, USER_LAT, USER_LNG);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("複数投稿のスコアリング→ソート→多様性制御が正しく動作する", () => {
    const posts = [
      makePost({ id: "1", shop_id: "A", shop: { latitude: USER_LAT + 0.001, longitude: USER_LNG } }),
      makePost({ id: "2", shop_id: "A", shop: { latitude: USER_LAT + 0.001, longitude: USER_LNG } }),
      makePost({ id: "3", shop_id: "B", shop: { latitude: USER_LAT + 0.002, longitude: USER_LNG } }),
      makePost({ id: "4", shop_id: "C", shop: { latitude: USER_LAT + 0.003, longitude: USER_LNG } }),
    ];

    const scored = posts
      .map((p) => ({
        ...p,
        _score: scoreNearby(p, USER_LAT, USER_LNG),
      }))
      .filter((p) => p._score > 0)
      .sort((a, b) => b._score - a._score);

    const diversified = diversifyPosts(scored);

    expect(diversified).toHaveLength(4);
    // 先頭2つが同じ店舗にならないことを確認
    expect(diversified[0].shop_id).not.toBe(diversified[1].shop_id);
  });
});

// ============================================================
// 動的半径テスト
// ============================================================

describe("動的半径", () => {
  it("DISTANCE_TIERS が正しい構成を持つ", () => {
    expect(DISTANCE_TIERS.length).toBeGreaterThanOrEqual(2);
    // 段階的に広がる
    for (let i = 1; i < DISTANCE_TIERS.length; i++) {
      expect(DISTANCE_TIERS[i].maxKm).toBeGreaterThan(DISTANCE_TIERS[i - 1].maxKm);
    }
    // 最後のティアは minResults=0（必ず採用される）
    expect(DISTANCE_TIERS[DISTANCE_TIERS.length - 1].minResults).toBe(0);
  });

  it("maxDistanceKm=5 のとき、10km先の店舗はスコア0", () => {
    const post = makePost({
      shop: { latitude: USER_LAT + 0.09, longitude: USER_LNG }, // ~10km
    });
    const score = scoreNearby(post, USER_LAT, USER_LNG, { maxDistanceKm: 5 });
    expect(score).toBe(0);
  });

  it("maxDistanceKm=15 のとき、10km先の店舗もスコアが出る", () => {
    const post = makePost({
      shop: { latitude: USER_LAT + 0.09, longitude: USER_LNG }, // ~10km
    });
    const score = scoreNearby(post, USER_LAT, USER_LNG, { maxDistanceKm: 15 });
    expect(score).toBeGreaterThan(0);
  });

  it("maxDistanceKm=30 のとき、25km先の店舗もスコアが出る", () => {
    const post = makePost({
      shop: { latitude: USER_LAT + 0.22, longitude: USER_LNG }, // ~24km
    });
    const score = scoreNearby(post, USER_LAT, USER_LNG, { maxDistanceKm: 30 });
    expect(score).toBeGreaterThan(0);
  });

  it("デフォルト（maxDistanceKm未指定）は30km", () => {
    const post = makePost({
      shop: { latitude: USER_LAT + 0.22, longitude: USER_LNG }, // ~24km
    });
    const scoreDefault = scoreNearby(post, USER_LAT, USER_LNG);
    const score30 = scoreNearby(post, USER_LAT, USER_LNG, { maxDistanceKm: 30 });
    expect(scoreDefault).toBeCloseTo(score30, 5);
  });

  it("近い店舗のほうが遠い店舗より常にスコアが高い（どの半径でも）", () => {
    const close = makePost({
      id: "close",
      shop: { latitude: USER_LAT + 0.01, longitude: USER_LNG }, // ~1km
    });
    const far = makePost({
      id: "far",
      shop: { latitude: USER_LAT + 0.1, longitude: USER_LNG }, // ~11km
    });

    for (const maxKm of [15, 30]) {
      const closeScore = scoreNearby(close, USER_LAT, USER_LNG, { maxDistanceKm: maxKm });
      const farScore = scoreNearby(far, USER_LAT, USER_LNG, { maxDistanceKm: maxKm });
      expect(closeScore).toBeGreaterThan(farScore);
    }
  });
});
