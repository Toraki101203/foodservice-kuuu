"use client";

import { useState, useEffect } from "react";
import { MapPin, Search, Filter } from "lucide-react";
import { Button, Input, SeatStatusBadge } from "@/components/ui";
import { useLocationStore } from "@/store";
import Link from "next/link";

// TODO: Mapboxの実装
// import Map from "react-map-gl";

/**
 * 発見ページ（MAP）
 * 位置情報を使用して近くの店舗を地図上に表示
 */
export default function DiscoverPage() {
    const { latitude, longitude, isLoading, error, setLocation, setLoading, setError } =
        useLocationStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // 位置情報を取得
    useEffect(() => {
        if (!latitude && !longitude && !isLoading) {
            setLoading(true);
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setLocation(position.coords.latitude, position.coords.longitude);
                        setLoading(false);
                    },
                    (err) => {
                        setError("位置情報を取得できませんでした。設定から許可してください。");
                        setLoading(false);
                        // デフォルト: 熊本市
                        setLocation(32.8031, 130.7079);
                    }
                );
            } else {
                setError("お使いのブラウザは位置情報に対応していません。");
                setLoading(false);
                // デフォルト: 熊本市
                setLocation(32.8031, 130.7079);
            }
        }
    }, [latitude, longitude, isLoading, setLocation, setLoading, setError]);

    return (
        <div className="flex h-[calc(100dvh-7.5rem)] flex-col">
            {/* 検索バー */}
            <div className="border-b border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="エリア・店名で検索"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="md"
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex-shrink-0"
                        aria-label="フィルター"
                    >
                        <Filter className="size-5" />
                    </Button>
                </div>

                {/* フィルターパネル */}
                {showFilters && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button className="rounded-full bg-orange-100 px-3 py-1.5 text-sm text-orange-600">
                            🟢 空席あり
                        </button>
                        <button className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
                            居酒屋
                        </button>
                        <button className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
                            ラーメン
                        </button>
                        <button className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
                            カフェ
                        </button>
                        <button className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
                            和食
                        </button>
                    </div>
                )}
            </div>

            {/* 地図エリア */}
            <div className="relative flex-1 bg-gray-200">
                {isLoading ? (
                    <div className="flex size-full items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto mb-2 size-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                            <p className="text-sm text-gray-600">位置情報を取得中...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* TODO: Mapbox地図を実装 */}
                        <div className="flex size-full items-center justify-center bg-gradient-to-b from-blue-100 to-blue-200">
                            <div className="text-center">
                                <MapPin className="mx-auto mb-2 size-12 text-orange-500" />
                                <p className="text-sm text-gray-600">
                                    {latitude && longitude
                                        ? `現在地: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                                        : "地図を読み込み中..."}
                                </p>
                                {error && (
                                    <p className="mt-2 text-xs text-red-500">{error}</p>
                                )}
                            </div>
                        </div>

                        {/* サンプル店舗マーカー */}
                        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
                            <div className="flex size-10 items-center justify-center rounded-full bg-green-500 text-white shadow-lg">
                                🍜
                            </div>
                        </div>
                        <div className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="flex size-10 items-center justify-center rounded-full bg-yellow-500 text-white shadow-lg">
                                🍺
                            </div>
                        </div>
                        <div className="absolute right-1/4 top-2/5 -translate-x-1/2 -translate-y-1/2">
                            <div className="flex size-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
                                🍣
                            </div>
                        </div>
                    </>
                )}

                {/* 現在地ボタン */}
                <button
                    className="absolute bottom-4 right-4 flex size-12 items-center justify-center rounded-full bg-white shadow-lg"
                    onClick={() => {
                        setLoading(true);
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                setLocation(position.coords.latitude, position.coords.longitude);
                                setLoading(false);
                            },
                            () => setLoading(false)
                        );
                    }}
                    aria-label="現在地に移動"
                >
                    <MapPin className="size-6 text-orange-500" />
                </button>
            </div>

            {/* 店舗リスト（横スクロール） */}
            <div className="border-t border-gray-200 bg-white">
                <div className="flex gap-3 overflow-x-auto px-4 py-3">
                    {/* サンプル店舗カード */}
                    {[
                        { name: "麺屋 Kuuu", category: "ラーメン", status: "available" as const },
                        { name: "居酒屋 さくら", category: "居酒屋", status: "busy" as const },
                        { name: "鮨 匠", category: "寿司", status: "full" as const },
                    ].map((shop, i) => (
                        <Link
                            href={`/restaurants/${i + 1}`}
                            key={i}
                            className="flex w-64 flex-shrink-0 items-center gap-3 rounded-xl bg-gray-50 p-3"
                        >
                            <div className="size-14 flex-shrink-0 rounded-lg bg-gray-300" />
                            <div className="flex-1 overflow-hidden">
                                <h3 className="truncate font-medium text-gray-900">
                                    {shop.name}
                                </h3>
                                <p className="text-sm text-gray-500">{shop.category}</p>
                                <SeatStatusBadge status={shop.status} className="mt-1 scale-90 origin-left" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
