"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Heart, MapPin, Store, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/database";

type Shop = Database["public"]["Tables"]["shops"]["Row"];

export default function FavoritesPage() {
    const supabase = createClient();
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const fetchFavorites = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            setIsAuthenticated(true);

            const { data } = await supabase
                .from("favorites")
                .select("shop_id, shops(*)")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (data) {
                const formattedShops = data
                    .map((item) => item.shops as unknown as Shop)
                    .filter(Boolean);

                setShops(formattedShops);
            }
            setLoading(false);
        };

        fetchFavorites();
    }, [supabase]);

    if (loading) {
        return (
            <div className="flex min-h-[60dvh] items-center justify-center">
                <div className="text-sm text-gray-400">読み込み中...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
                <div className="mb-4 rounded-full bg-gray-100 p-4">
                    <Heart className="size-8 text-gray-400" />
                </div>
                <h1 className="mb-2 text-xl font-bold text-gray-800">
                    ログインが必要です
                </h1>
                <p className="mb-6 text-sm text-gray-500">
                    お気に入り機能を利用するには、ログインまたはアカウント登録をお願いします。
                </p>
                <Link
                    href="/login"
                    className="flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 px-8 font-bold text-white transition-colors hover:bg-orange-600"
                >
                    ログインへ
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-lg flex-col px-4 py-6">
            <div className="mb-6 flex items-center gap-2">
                <Heart className="size-6 text-orange-500" fill="currentColor" />
                <h1 className="text-2xl font-bold text-gray-800">
                    お気に入りのお店
                </h1>
            </div>

            <div className="flex-1">
                <h2 className="mb-4 text-sm font-bold text-gray-400">
                    保存したお店 {shops.length}件
                </h2>

                <div className="flex flex-col gap-4">
                    {shops.map((shop) => (
                        <Link
                            key={shop.id}
                            href={`/shop/${shop.id}`}
                            className="group flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
                        >
                            <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                {shop.atmosphere_photos && shop.atmosphere_photos.length > 0 ? (
                                    <img
                                        src={shop.atmosphere_photos[0]}
                                        alt={shop.name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <div className="flex size-full items-center justify-center text-gray-400">
                                        <Store className="size-8 opacity-50" />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-1 flex-col justify-center">
                                <div className="mb-1 text-xs font-bold text-orange-500">
                                    {shop.genre}
                                </div>
                                <h3 className="mb-1 line-clamp-1 font-bold text-gray-800 group-hover:text-orange-500">
                                    {shop.name}
                                </h3>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <MapPin className="size-3 shrink-0" />
                                    <span className="line-clamp-1">{shop.address}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-center pl-2 text-gray-400">
                                <ChevronRight className="size-5" />
                            </div>
                        </Link>
                    ))}

                    {shops.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Store className="mb-4 size-10 text-gray-300" />
                            <p className="text-sm text-gray-500">
                                まだお気に入りのお店がありません。<br />
                                気になるお店のブックマークを押して<br />保存しましょう！
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
