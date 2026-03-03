"use client";

import { useState, useEffect } from "react";
import PostCard from "@/components/timeline/PostCard";
import { List as ListIcon, MapPin, SlidersHorizontal, X } from "lucide-react";
import type { Post, Restaurant } from "@/types/database";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type PostWithShop = Post & {
    shop: Restaurant;
    coupon: any | null; // Placeholder as coupon is not in database.ts
};

interface ClientTabControllerProps {
    posts: PostWithShop[];
    initialFavoriteShopIds: string[];
}

// 距離計算用の関数 (Haversine formula)
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // 地球の半径 (km)
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
}

export default function ClientTabController({ posts, initialFavoriteShopIds }: ClientTabControllerProps) {
    const supabase = createClient();
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [sortedPosts, setSortedPosts] = useState(posts);
    const [favoriteShopIds, setFavoriteShopIds] = useState<string[]>(initialFavoriteShopIds);
    const [userId, setUserId] = useState<string | null>(null);

    // フィルター用ステート
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterOpenOnly, setFilterOpenOnly] = useState(false);
    const [filterGenre, setFilterGenre] = useState<string>("all");

    // 位置情報取得 & ユーザー確認
    useEffect(() => {
        const init = async () => {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUserId(data.user.id);

            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setUserLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        });
                    },
                    (error) => {
                        console.log("Geolocation error:", error);
                    }
                );
            }
        };
        init();
    }, [supabase]);

    // ソート・フィルター処理
    useEffect(() => {
        let result = [...posts];

        // フィルター適用
        if (filterOpenOnly) {
            result = result.filter(post => post.shop.is_open);
        }
        if (filterGenre !== "all") {
            result = result.filter(post => post.shop.genre.includes(filterGenre));
        }

        // ソート適用
        if (userLocation) {
            result.sort((a, b) => {
                const shopA = a.shop;
                const shopB = b.shop;
                if (!shopA.latitude || !shopA.longitude) return 1;
                if (!shopB.latitude || !shopB.longitude) return -1;

                const distA = getDistanceInKm(userLocation.lat, userLocation.lng, shopA.latitude, shopA.longitude);
                const distB = getDistanceInKm(userLocation.lat, userLocation.lng, shopB.latitude, shopB.longitude);
                return distA - distB;
            });
        }

        setSortedPosts(result);
    }, [userLocation, posts, filterOpenOnly, filterGenre]);

    const toggleFavorite = async (shopId: string) => {
        if (!userId) {
            window.location.href = "/login"; // 未ログインはログインへ
            return;
        }

        const isFavorited = favoriteShopIds.includes(shopId);
        if (isFavorited) {
            setFavoriteShopIds((prev) => prev.filter((id) => id !== shopId));
            await supabase.from("favorites").delete().eq("user_id", userId).eq("shop_id", shopId);
        } else {
            setFavoriteShopIds((prev) => [...prev, shopId]);
            await supabase.from("favorites").insert({ user_id: userId, shop_id: shopId });
        }
    };

    return (
        <>
            {/* フィルターボタン */}
            <div className="fixed bottom-24 right-4 z-10 rounded-full shadow-lg">
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className={cn(
                        "flex size-14 items-center justify-center rounded-full bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-border)] shadow-xl transition-transform hover:scale-105",
                        (filterOpenOnly || filterGenre !== "all") ? "text-[var(--color-primary)] border-[var(--color-primary)]" : "text-[var(--color-text-secondary)]"
                    )}
                >
                    <SlidersHorizontal className="size-6" />
                    {(filterOpenOnly || filterGenre !== "all") && (
                        <span className="absolute top-0 right-0 size-3.5 rounded-full bg-[var(--color-primary)] border-2 border-[var(--color-surface)]"></span>
                    )}
                </button>
            </div>

            {/* フィルターモーダル */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
                    <div className="w-full max-w-sm rounded-t-2xl bg-[var(--color-surface)] p-6 shadow-xl sm:rounded-2xl pb-[env(safe-area-inset-bottom)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">絞り込み</h3>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="rounded-full p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* 営業状態フィルター */}
                            <div>
                                <h4 className="mb-3 text-sm font-bold text-[var(--color-text-secondary)]">営業状況</h4>
                                <label className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-4 cursor-pointer hover:bg-[var(--color-surface-secondary)] transition-colors">
                                    <span className="font-bold text-[var(--color-text-primary)]">今営業中の店舗のみ</span>
                                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${filterOpenOnly ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"}`}>
                                        <span className={`inline-block size-4 transform rounded-full bg-white transition-transform ${filterOpenOnly ? "translate-x-6" : "translate-x-1"}`} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={filterOpenOnly}
                                        onChange={(e) => setFilterOpenOnly(e.target.checked)}
                                    />
                                </label>
                            </div>

                            {/* ジャンルフィルター */}
                            <div>
                                <h4 className="mb-3 text-sm font-bold text-[var(--color-text-secondary)]">ジャンル</h4>
                                <select
                                    value={filterGenre}
                                    onChange={(e) => setFilterGenre(e.target.value)}
                                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-bold text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] appearance-none"
                                >
                                    <option value="all">すべてのジャンル</option>
                                    <option value="居酒屋">居酒屋</option>
                                    <option value="焼き鳥">焼き鳥・串焼き</option>
                                    <option value="寿司">寿司・海鮮</option>
                                    <option value="カフェ">カフェ・スイーツ</option>
                                    <option value="ラーメン">ラーメン・麺類</option>
                                    <option value="バー">バー・ダイニング</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsFilterOpen(false)}
                            className="mt-8 w-full rounded-xl bg-[var(--color-primary)] py-3.5 text-sm font-bold text-white transition-transform hover:scale-[0.98]"
                        >
                            結果を表示 ({sortedPosts.length}件)
                        </button>
                    </div>
                </div>
            )}

            {/* コンテンツ領域 */}
            <div className="px-4 pb-24 pt-4">
                <div className="mb-4">
                    {userLocation ? (
                        <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-primary)]">
                            <MapPin className="size-4" />
                            現在地から近い順
                        </p>
                    ) : (
                        <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-secondary)]">
                            <MapPin className="size-4" />
                            最新の投稿順
                        </p>
                    )}
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {sortedPosts.map((post) => {
                        const distance = userLocation && post.shop.latitude && post.shop.longitude
                            ? getDistanceInKm(userLocation.lat, userLocation.lng, post.shop.latitude, post.shop.longitude)
                            : null;

                        return (
                            <PostCard
                                key={post.id}
                                post={post as any}
                                isFavorited={favoriteShopIds.includes(post.shop.id)}
                                onToggleFavorite={() => toggleFavorite(post.shop.id)}
                                distanceKm={distance}
                            />
                        );
                    })}
                </div>
            </div>
        </>
    );
}
