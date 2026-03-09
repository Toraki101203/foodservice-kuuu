"use client";
import { useState, useEffect, useMemo } from "react";
import { List, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocationStore } from "@/store";
import { ShopGridCard } from "./shop-grid-card";
import { NearbyMap } from "./nearby-map";
import { EmptyState } from "@/components/feed/empty-state";
import type { Restaurant } from "@/types/database";

interface NearbyTabProps {
    shops: Restaurant[];
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function NearbyTab({ shops }: NearbyTabProps) {
    const [view, setView] = useState<"list" | "map">("list");
    const { latitude, longitude, setLocation, setLoading, setError } = useLocationStore();

    useEffect(() => {
        if (latitude && longitude) return;
        if (!navigator.geolocation) {
            setError("位置情報が利用できません");
            return;
        }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation(pos.coords.latitude, pos.coords.longitude);
                setLoading(false);
            },
            () => {
                setError("位置情報の取得に失敗しました");
                setLoading(false);
            },
        );
    }, [latitude, longitude, setLocation, setLoading, setError]);

    const sortedShops = useMemo(() => {
        if (!latitude || !longitude) return shops;
        return [...shops]
            .map((shop) => ({
                ...shop,
                distance: getDistance(latitude, longitude, shop.latitude, shop.longitude),
            }))
            .sort((a, b) => a.distance - b.distance);
    }, [shops, latitude, longitude]);

    return (
        <div>
            {/* リスト/マップ切り替え */}
            <div className="flex items-center justify-end gap-2 px-4 py-2">
                <button
                    onClick={() => setView("list")}
                    className={cn("rounded-lg p-2", view === "list" ? "bg-orange-100 text-orange-600" : "text-gray-400")}
                    aria-label="リスト表示"
                >
                    <List className="size-5" />
                </button>
                <button
                    onClick={() => setView("map")}
                    className={cn("rounded-lg p-2", view === "map" ? "bg-orange-100 text-orange-600" : "text-gray-400")}
                    aria-label="マップ表示"
                >
                    <MapIcon className="size-5" />
                </button>
            </div>

            {view === "list" ? (
                <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                    {sortedShops.length === 0 ? (
                        <div className="col-span-2">
                            <EmptyState title="近くにお店がありません" description="位置情報を許可すると、近くのお店が表示されます" />
                        </div>
                    ) : (
                        sortedShops.map((shop) => (
                            <ShopGridCard
                                key={shop.id}
                                shop={shop}
                                distance={"distance" in shop ? (shop.distance as number) : undefined}
                            />
                        ))
                    )}
                </div>
            ) : (
                <NearbyMap shops={sortedShops} />
            )}
        </div>
    );
}
