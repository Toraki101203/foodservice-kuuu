"use client";

import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { ShopGridCard } from "@/components/discover/shop-grid-card";
import { EmptyState } from "@/components/feed/empty-state";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Shop, SeatStatus } from "@/types/database";

type ShopWithSeat = Shop & { seat_status: SeatStatus[] };

type FilterType = "available" | "distance" | "popular";

const AREAS = [
  "渋谷", "新宿", "池袋", "恵比寿", "六本木",
  "表参道", "銀座", "中目黒", "下北沢", "吉祥寺",
];

const GENRES = [
  { emoji: "\u{1F363}", label: "寿司" },
  { emoji: "\u{1F35C}", label: "ラーメン" },
  { emoji: "\u{1F355}", label: "イタリアン" },
  { emoji: "\u{1F969}", label: "焼肉" },
  { emoji: "\u{1F35B}", label: "カレー" },
  { emoji: "\u{1F37A}", label: "居酒屋" },
  { emoji: "\u2615", label: "カフェ" },
  { emoji: "\u{1F35E}", label: "パン" },
  { emoji: "\u{1F370}", label: "スイーツ" },
  { emoji: "\u{1F371}", label: "和食" },
  { emoji: "\u{1F962}", label: "中華" },
  { emoji: "\u{1F374}", label: "その他" },
];

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShopWithSeat[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);

  const searchShops = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("shops")
      .select("*, seat_status(*)")
      .or(`name.ilike.%${searchQuery}%,genre.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
      .limit(30);

    setResults(data ?? []);
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchShops(query);
  };

  const handleAreaClick = (area: string) => {
    setQuery(area);
    searchShops(area);
  };

  const handleGenreClick = (genre: string) => {
    setQuery(genre);
    searchShops(genre);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  const handleFilterToggle = (filter: FilterType) => {
    setActiveFilter((prev) => (prev === filter ? null : filter));
  };

  return (
    <div className="pb-20">
      {/* 検索バー */}
      <form onSubmit={handleSubmit} className="sticky top-0 z-10 bg-white px-4 pb-3 pt-4">
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
          <Search className="size-5 shrink-0 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="エリア、ジャンル、店名で検索"
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="検索をクリア"
              className="shrink-0 p-0.5"
            >
              <X className="size-4 text-gray-400" />
            </button>
          )}
        </div>
      </form>

      {/* 検索前: エリア + ジャンル */}
      {!hasSearched && (
        <div className="px-4">
          {/* エリア */}
          <h2 className="mb-3 text-sm font-bold text-gray-900">エリアから探す</h2>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {AREAS.map((area) => (
              <button
                key={area}
                onClick={() => handleAreaClick(area)}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 active:bg-gray-50"
              >
                {area}
              </button>
            ))}
          </div>

          {/* ジャンル */}
          <h2 className="mb-3 text-sm font-bold text-gray-900">ジャンルから探す</h2>
          <div className="grid grid-cols-2 gap-2">
            {GENRES.map(({ emoji, label }) => (
              <button
                key={label}
                onClick={() => handleGenreClick(label)}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left active:bg-gray-50"
              >
                <span className="text-xl">{emoji}</span>
                <span className="text-sm text-gray-700">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 検索後: フィルター + 結果 */}
      {hasSearched && (
        <div>
          {/* フィルターバー */}
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
            <button
              onClick={() => handleFilterToggle("available")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === "available"
                  ? "bg-orange-500 text-white"
                  : "border border-gray-200 bg-white text-gray-700"
              )}
            >
              空席あり
            </button>
            <button
              onClick={() => handleFilterToggle("distance")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === "distance"
                  ? "bg-orange-500 text-white"
                  : "border border-gray-200 bg-white text-gray-700"
              )}
            >
              距離順
            </button>
            <button
              onClick={() => handleFilterToggle("popular")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === "popular"
                  ? "bg-orange-500 text-white"
                  : "border border-gray-200 bg-white text-gray-700"
              )}
            >
              人気順
            </button>
          </div>

          {/* ローディング */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <span className="size-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
          )}

          {/* 検索結果 */}
          {!isLoading && results.length > 0 && (
            <div className="grid grid-cols-2 gap-3 px-4">
              {results.map((shop) => (
                <ShopGridCard key={shop.id} shop={shop} />
              ))}
            </div>
          )}

          {/* 結果なし */}
          {!isLoading && results.length === 0 && (
            <EmptyState
              icon={<Search className="size-12" />}
              title="該当するお店が見つかりませんでした"
              description="別のキーワードで検索してみてください"
            />
          )}
        </div>
      )}
    </div>
  );
}
