"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { UtensilsCrossed, MapPin } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { FeedCard, EmptyState, StoryBar, StoryViewer } from "@/components/feed";
import type { InstagramPost, Shop, SeatStatus, InstagramStory } from "@/types/database";

// ---- 閲覧済み投稿トラッキング（localStorage） ----

const VIEWED_STORAGE_KEY = "moguris_viewed_posts";
const VIEWED_MAX_COUNT = 200;
const VIEWED_EXPIRY_DAYS = 7;

type ViewedEntry = { id: string; at: number };

function getViewedPostIds(): Set<string> {
  try {
    const raw = localStorage.getItem(VIEWED_STORAGE_KEY);
    if (!raw) return new Set();
    const entries: ViewedEntry[] = JSON.parse(raw);
    const cutoff = Date.now() - VIEWED_EXPIRY_DAYS * 86_400_000;
    const valid = entries.filter((e) => e.at > cutoff);
    return new Set(valid.map((e) => e.id));
  } catch {
    return new Set();
  }
}

function markPostsAsViewed(postIds: string[]): void {
  try {
    const raw = localStorage.getItem(VIEWED_STORAGE_KEY);
    const entries: ViewedEntry[] = raw ? JSON.parse(raw) : [];
    const existing = new Set(entries.map((e) => e.id));
    const now = Date.now();
    const cutoff = now - VIEWED_EXPIRY_DAYS * 86_400_000;

    const newEntries = postIds
      .filter((id) => !existing.has(id))
      .map((id) => ({ id, at: now }));

    const merged = [...entries.filter((e) => e.at > cutoff), ...newEntries]
      .slice(-VIEWED_MAX_COUNT);

    localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // localStorage が使えない環境では何もしない
  }
}

// ---- ジャンル嗜好トラッキング（localStorage） ----

const GENRE_PREF_KEY = "moguris_genre_prefs";
const GENRE_MAX_ENTRIES = 50;

type GenrePrefEntry = { genre: string; count: number; lastAt: number };

function getGenrePreferences(): Map<string, number> {
  try {
    const raw = localStorage.getItem(GENRE_PREF_KEY);
    if (!raw) return new Map();
    const entries: GenrePrefEntry[] = JSON.parse(raw);
    const cutoff = Date.now() - 30 * 86_400_000; // 30日以内
    const valid = entries.filter((e) => e.lastAt > cutoff);
    return new Map(valid.map((e) => [e.genre, e.count]));
  } catch {
    return new Map();
  }
}

function trackGenreClick(genre: string | null): void {
  if (!genre) return;
  try {
    const raw = localStorage.getItem(GENRE_PREF_KEY);
    const entries: GenrePrefEntry[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const cutoff = now - 30 * 86_400_000;

    const valid = entries.filter((e) => e.lastAt > cutoff);
    const existing = valid.find((e) => e.genre === genre);
    if (existing) {
      existing.count += 1;
      existing.lastAt = now;
    } else {
      valid.push({ genre, count: 1, lastAt: now });
    }

    // 上限を超えたら古い順に削除
    valid.sort((a, b) => b.lastAt - a.lastAt);
    localStorage.setItem(
      GENRE_PREF_KEY,
      JSON.stringify(valid.slice(0, GENRE_MAX_ENTRIES))
    );
  } catch {
    // localStorage が使えない環境では何もしない
  }
}

function getGenrePreferencesParam(): string {
  const prefs = getGenrePreferences();
  if (prefs.size === 0) return "";
  // "ラーメン:5,カフェ:3" 形式
  return Array.from(prefs.entries())
    .map(([g, c]) => `${g}:${c}`)
    .join(",");
}

type PostWithShop = InstagramPost & {
  shop: Shop & { seat_status: SeatStatus[] };
  _distanceLabel?: string | null;
};

type StoryGroup = {
  shop: Shop & { seat_status: SeatStatus[] };
  stories: InstagramStory[];
  hasUnread: boolean;
};

type HomeClientProps = {
  followingPosts: PostWithShop[];
  stories: StoryGroup[];
  hasFollows: boolean;
};

const TABS = ["近く", "フォロー中", "人気"];

export function HomeClient({
  followingPosts,
  stories,
  hasFollows,
}: HomeClientProps) {
  // フォローがなければ「近く」をデフォルトに
  const [activeTab, setActiveTab] = useState(hasFollows ? "フォロー中" : "近く");
  const [viewingStory, setViewingStory] = useState<number | null>(null);

  // 位置情報
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);

  // API から取得する投稿
  const [nearbyPosts, setNearbyPosts] = useState<PostWithShop[]>([]);
  const [popularPosts, setPopularPosts] = useState<PostWithShop[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingPopular, setLoadingPopular] = useState(false);

  // 閲覧済み投稿IDを保持（初回のみ読み込み）
  const viewedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    viewedIdsRef.current = getViewedPostIds();
  }, []);

  // 位置情報を取得
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => setLocationError(true),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  // 閲覧済みIDをクエリパラメータ用に変換
  const getViewedParam = useCallback((): string => {
    const ids = Array.from(viewedIdsRef.current);
    // URLが長すぎないように直近50件に制限（UUID×50 ≈ 1,800文字）
    return ids.slice(-50).join(",");
  }, []);

  // 近くの投稿を取得
  const fetchNearby = useCallback(async (lat: number, lng: number) => {
    setLoadingNearby(true);
    try {
      const viewed = getViewedParam();
      const genrePrefs = getGenrePreferencesParam();
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        limit: "20",
      });
      if (viewed) params.set("viewed", viewed);
      if (genrePrefs) params.set("genrePrefs", genrePrefs);

      const res = await fetch(`/api/feed/nearby?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNearbyPosts(data.posts);
        const postIds = (data.posts as PostWithShop[]).map((p) => p.id);
        markPostsAsViewed(postIds);
        viewedIdsRef.current = getViewedPostIds();
      }
    } finally {
      setLoadingNearby(false);
    }
  }, [getViewedParam]);

  // 人気の投稿を取得
  const fetchPopular = useCallback(async (lat: number | null, lng: number | null) => {
    setLoadingPopular(true);
    try {
      const viewed = getViewedParam();
      const genrePrefs = getGenrePreferencesParam();
      const params = new URLSearchParams({ limit: "20" });
      if (lat != null && lng != null) {
        params.set("lat", String(lat));
        params.set("lng", String(lng));
      }
      if (viewed) params.set("viewed", viewed);
      if (genrePrefs) params.set("genrePrefs", genrePrefs);

      const res = await fetch(`/api/feed/popular?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPopularPosts(data.posts);
        const postIds = (data.posts as PostWithShop[]).map((p) => p.id);
        markPostsAsViewed(postIds);
        viewedIdsRef.current = getViewedPostIds();
      }
    } finally {
      setLoadingPopular(false);
    }
  }, [getViewedParam]);

  // 位置情報が取れたらフィードを取得
  useEffect(() => {
    if (userLocation) {
      fetchNearby(userLocation.lat, userLocation.lng);
      fetchPopular(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, fetchNearby, fetchPopular]);

  // 位置情報なしでも人気タブは取得
  useEffect(() => {
    if (locationError) {
      fetchPopular(null, null);
    }
  }, [locationError, fetchPopular]);

  const currentPosts =
    activeTab === "フォロー中"
      ? followingPosts
      : activeTab === "近く"
        ? nearbyPosts
        : popularPosts;

  const isLoading =
    (activeTab === "近く" && loadingNearby) ||
    (activeTab === "人気" && loadingPopular);

  return (
    <>
      <StoryBar
        items={stories}
        onStoryClick={(index) => setViewingStory(index)}
      />
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 位置情報エラー（近くタブ時のみ表示） */}
      {activeTab === "近く" && locationError && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg bg-orange-50 px-4 py-3">
          <MapPin className="size-4 text-orange-500" />
          <p className="text-sm text-orange-700">
            位置情報を許可すると、近くのお店の投稿が表示されます
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      ) : currentPosts.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="size-12" />}
          title={
            activeTab === "フォロー中"
              ? "まだお店をフォローしていません"
              : activeTab === "近く"
                ? "近くに投稿が見つかりません"
                : "投稿が見つかりません"
          }
          description={
            activeTab === "フォロー中"
              ? "近くのお店を見つけてフォローすると最新の投稿がここに表示されます"
              : "お店が投稿すると、ここに表示されます"
          }
          actionLabel="お店を検索する"
          actionHref="/search"
        />
      ) : (
        <div>
          {currentPosts.map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              distance={post._distanceLabel ?? undefined}
              onPostClick={trackGenreClick}
            />
          ))}
        </div>
      )}

      {viewingStory !== null && (
        <StoryViewer
          shops={stories}
          initialShopIndex={viewingStory}
          onClose={() => setViewingStory(null)}
        />
      )}
    </>
  );
}
