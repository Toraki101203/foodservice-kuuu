"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Filter, Map as MapIcon, List } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";
import { useLocationStore } from "@/store";
import { cn } from "@/lib/utils";
import { MapView } from "./MapView";
import { RestaurantCard } from "./RestaurantCard";
import type { Restaurant, SeatStatus, InstagramPost } from "@/types/database";

type ViewMode = "map" | "list";

interface DiscoverViewProps {
  restaurants: Restaurant[];
  seatStatuses: SeatStatus[];
  instagramPosts: InstagramPost[];
  initialFavoriteIds: string[];
}

/**
 * Haversine 距離計算（km）
 */
function calcDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * メイン画面 — 地図/リスト切替UI
 * 検索バー + フィルター（空席あり / ジャンル）+ タブ切替
 */
export function DiscoverView({
  restaurants,
  seatStatuses,
  instagramPosts,
}: DiscoverViewProps) {
  const { latitude, longitude, isLoading, setLocation, setLoading, setError } =
    useLocationStore();

  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>("すべて");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Restaurant | null>(null);

  // Google Maps API のロード
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    language: "ja",
    region: "JP",
  });

  // 位置情報を取得
  useEffect(() => {
    if (!latitude && !longitude && !isLoading) {
      setLoading(true);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation(
              position.coords.latitude,
              position.coords.longitude
            );
            setLoading(false);
          },
          () => {
            setError("位置情報を取得できませんでした。");
            setLoading(false);
            // デフォルト: 熊本
            setLocation(32.8032, 130.7079);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      } else {
        setError("お使いのブラウザは位置情報に対応していません。");
        setLoading(false);
        setLocation(32.8032, 130.7079);
      }
    }
  }, [latitude, longitude, isLoading, setLocation, setLoading, setError]);

  // seat_status を restaurant_id でルックアップ
  const seatStatusMap = useMemo(() => {
    const map = new Map<string, SeatStatus>();
    seatStatuses.forEach((s) => map.set(s.restaurant_id, s));
    return map;
  }, [seatStatuses]);

  // instagram_posts を restaurant_id で最新1件ルックアップ
  const instagramPostMap = useMemo(() => {
    const map = new Map<string, InstagramPost>();
    // instagramPosts は posted_at desc で来ているので、最初に見つかったものが最新
    instagramPosts.forEach((p) => {
      if (!map.has(p.restaurant_id)) {
        map.set(p.restaurant_id, p);
      }
    });
    return map;
  }, [instagramPosts]);

  // 利用可能ジャンル一覧
  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    restaurants.forEach((r) => {
      if (r.genre) genres.add(r.genre);
    });
    return ["すべて", ...Array.from(genres)];
  }, [restaurants]);

  // フィルター + 距離計算
  const filteredShops = useMemo(() => {
    const result = restaurants
      .filter((shop) => {
        const hasCoords = Boolean(shop.latitude && shop.longitude);
        const matchQuery =
          searchQuery === "" ||
          shop.name.includes(searchQuery) ||
          (shop.genre && shop.genre.includes(searchQuery)) ||
          (shop.address && shop.address.includes(searchQuery));
        const matchGenre =
          selectedGenre === "すべて" || shop.genre === selectedGenre;

        // 空席ありフィルター
        let matchSeat = true;
        if (showOnlyAvailable) {
          const ss = seatStatusMap.get(shop.id);
          matchSeat = ss?.status === "available";
        }

        return hasCoords && matchQuery && matchGenre && matchSeat;
      })
      .map((shop) => {
        const distance =
          latitude && longitude
            ? calcDistance(latitude, longitude, shop.latitude, shop.longitude)
            : null;
        return { shop, distance };
      });

    // 距離でソート（近い順）
    result.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    return result;
  }, [
    restaurants,
    searchQuery,
    selectedGenre,
    showOnlyAvailable,
    seatStatusMap,
    latitude,
    longitude,
  ]);

  // MapView に渡すフィルター済み店舗リスト
  const filteredShopsList = useMemo(
    () => filteredShops.map((r) => r.shop),
    [filteredShops]
  );

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      {/* 検索バー + ビュー切替 */}
      <div className="relative z-10 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="エリア・ジャンル・店名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 leading-relaxed placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-colors",
              showFilters
                ? "border-orange-500 bg-orange-50 text-orange-500"
                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            )}
            aria-label="フィルター"
          >
            <Filter className="size-5" />
          </button>
        </div>

        {/* フィルター + タブ */}
        <div className="mt-3 flex items-center justify-between">
          {/* フィルターチップ */}
          <div className="flex flex-wrap items-center gap-2">
            {showFilters && (
              <>
                <button
                  onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-bold transition-colors",
                    showOnlyAvailable
                      ? "border border-green-200 bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  空席あり
                </button>

                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="rounded-full border-none bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {availableGenres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* 地図 / リスト 切替タブ */}
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode("map")}
              className={cn(
                "flex min-h-[36px] items-center gap-1 px-3 text-sm font-bold transition-colors",
                viewMode === "map"
                  ? "bg-orange-500 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              )}
              aria-label="地図ビュー"
            >
              <MapIcon className="size-4" />
              <span className="hidden sm:inline">地図</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex min-h-[36px] items-center gap-1 px-3 text-sm font-bold transition-colors",
                viewMode === "list"
                  ? "bg-orange-500 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              )}
              aria-label="リストビュー"
            >
              <List className="size-4" />
              <span className="hidden sm:inline">リスト</span>
            </button>
          </div>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="relative flex-1 bg-gray-100">
        {viewMode === "map" ? (
          <MapView
            shops={filteredShopsList}
            seatStatusMap={seatStatusMap}
            isMapLoaded={isLoaded}
            selectedShop={selectedShop}
            onSelectShop={setSelectedShop}
          />
        ) : (
          <div className="h-full overflow-y-auto px-4 py-3">
            {filteredShops.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-500">
                  {filteredShops.length}件の店舗
                </p>
                {filteredShops.map(({ shop, distance }) => (
                  <RestaurantCard
                    key={shop.id}
                    restaurant={shop}
                    seatStatus={seatStatusMap.get(shop.id)}
                    instagramPost={instagramPostMap.get(shop.id)}
                    distance={distance}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-gray-500">
                  お店が見つかりません
                </p>
                <p className="mt-1 text-xs text-gray-400 text-pretty">
                  検索条件を変更してお試しください
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
