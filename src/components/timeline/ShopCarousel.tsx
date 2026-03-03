"use client";

import Link from "next/link";
import Image from "next/image";
import { Store, ChevronRight } from "lucide-react";
import type { Restaurant } from "@/types/database";

interface ShopCarouselProps {
    shops: Restaurant[];
}

// ジャンルごとのアクセントカラー
function getGenreColor(genre: string): string {
    const map: Record<string, string> = {
        "居酒屋": "bg-amber-500",
        "焼き鳥": "bg-orange-500",
        "寿司": "bg-blue-500",
        "カフェ": "bg-emerald-500",
        "ラーメン": "bg-red-500",
        "バー": "bg-purple-500",
        "イタリアン": "bg-rose-500",
        "和食": "bg-teal-500",
    };
    for (const [key, value] of Object.entries(map)) {
        if (genre.includes(key)) return value;
    }
    return "bg-gray-500";
}

export default function ShopCarousel({ shops }: ShopCarouselProps) {
    if (shops.length === 0) return null;

    return (
        <section className="mb-6">
            {/* セクションヘッダー */}
            <div className="mb-3 flex items-center justify-between px-4">
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                    おすすめのお店
                </h2>
                <Link
                    href="/discover"
                    className="flex items-center gap-0.5 text-xs font-bold text-[var(--color-primary)]"
                >
                    もっと見る
                    <ChevronRight className="size-3.5" />
                </Link>
            </div>

            {/* 横スクロールカルーセル */}
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory hide-scrollbar">
                {shops.map((shop) => (
                    <Link
                        key={shop.id}
                        href={`/shop/${shop.id}`}
                        className="flex-none snap-start"
                    >
                        <div className="w-32 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-shadow hover:shadow-lg">
                            {/* 店舗画像 */}
                            <div className="relative aspect-square w-full overflow-hidden bg-[var(--color-surface-secondary)]">
                                {shop.atmosphere_photos?.[0] ? (
                                    <Image
                                        src={shop.atmosphere_photos[0]}
                                        alt={shop.name}
                                        fill
                                        className="object-cover"
                                        sizes="128px"
                                    />
                                ) : (
                                    <div className="flex size-full items-center justify-center text-[var(--color-text-muted)]">
                                        <Store className="size-8" />
                                    </div>
                                )}

                                {/* 営業中バッジ */}
                                {shop.is_open && (
                                    <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                        <span className="size-1.5 rounded-full bg-white animate-pulse" />
                                        営業中
                                    </div>
                                )}
                            </div>

                            {/* 店舗情報 */}
                            <div className="p-2.5">
                                <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                                    {shop.name}
                                </p>
                                {shop.genre && (
                                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${getGenreColor(shop.genre)}`}>
                                        {shop.genre}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
