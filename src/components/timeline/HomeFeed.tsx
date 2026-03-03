"use client";

import { useState, useEffect } from "react";
import PostCard from "@/components/timeline/PostCard";
import ShopCarousel from "@/components/timeline/ShopCarousel";
import { MapPin, SlidersHorizontal, X, Utensils } from "lucide-react";
import type { Post, Restaurant } from "@/types/database";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type PostWithShop = Post & {
    shop: Restaurant;
    coupon: any | null;
};

interface HomeFeedProps {
    posts: PostWithShop[];
    initialFavoriteShopIds: string[];
    recommendedShops: Restaurant[];
}

// 距離計算用の関数 (Haversine formula)
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
}

export default function HomeFeed({ posts, initialFavoriteShopIds, recommendedShops }: HomeFeedProps) {
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

        if (filterOpenOnly) {
            result = result.filter(post => post.shop.is_open);
        }
        if (filterGenre !== "all") {
            result = result.filter(post => post.shop.genre.includes(filterGenre));
        }

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
            window.location.href = "/login";
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
        <div className="pb-24">
            {/* おすすめ店舗カルーセル */}
            <div className="pt-4">
                <ShopCarousel shops={recommendedShops} />
            </div>

            {/* フィードヘッダー */}
            <div className="mb-3 flex items-center justify-between px-4">
                <div className="flex items-center gap-1.5">
                    {userLocation ? (
                        <p className="flex items-center gap-1.5 text-sm font-bold text-orange-500">
                            <MapPin className="size-4" />
                            近くのお店
                        </p>
                    ) : (
                        <p className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
                            <MapPin className="size-4" />
                            最新の投稿
                        </p>
                    )}
                </div>

                {/* フィルターボタン（インライン） */}
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className={cn(
                        "flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                        (filterOpenOnly || filterGenre !== "all")
                            ? "border-orange-500 bg-orange-50 text-orange-600"
                            : "border-gray-300 text-gray-500 hover:border-gray-400"
                    )}
                >
                    <SlidersHorizontal className="size-3.5" />
                    絞り込み
                    {(filterOpenOnly || filterGenre !== "all") && (
                        <span className="flex size-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                            !
                        </span>
                    )}
                </button>
            </div>

            {/* フィルターモーダル */}
            {isFilterOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    onClick={() => setIsFilterOpen(false)}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800">絞り込み</h3>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
                                aria-label="閉じる"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* 営業状態フィルター */}
                            <div>
                                <h4 className="mb-3 text-sm font-bold text-gray-500">営業状況</h4>
                                <label className="flex items-center justify-between rounded-xl border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                                    <span className="font-bold text-gray-700">今営業中の店舗のみ</span>
                                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${filterOpenOnly ? "bg-orange-500" : "bg-gray-300"}`}>
                                        <span className={`inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform ${filterOpenOnly ? "translate-x-6" : "translate-x-1"}`} />
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
                                <h4 className="mb-3 text-sm font-bold text-gray-500">ジャンル</h4>
                                <select
                                    value={filterGenre}
                                    onChange={(e) => setFilterGenre(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 appearance-none"
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
                            className="mt-8 w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white transition-transform hover:bg-orange-600 hover:scale-[0.98]"
                        >
                            結果を表示 ({sortedPosts.length}件)
                        </button>
                    </div>
                </div>
            )}

            {/* 投稿フィード */}
            {sortedPosts.length > 0 ? (
                <div className="divide-y divide-gray-100">
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
            ) : (
                /* 空状態 UI */
                <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100">
                        <Utensils className="size-7 text-gray-400" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-gray-700">
                        まだ投稿がありません
                    </h3>
                    <p className="max-w-xs text-sm leading-relaxed text-gray-500">
                        お気に入りのお店を「発見」タブで見つけて、最新情報をチェックしましょう！
                    </p>
                </div>
            )}
        </div>
    );
}
