"use client";
import { useLocationStore } from "@/store";
import type { Restaurant } from "@/types/database";

interface NearbyMapProps {
    shops: Restaurant[];
}

export function NearbyMap({ shops }: NearbyMapProps) {
    const { latitude, longitude } = useLocationStore();

    const center = latitude && longitude
        ? { lat: latitude, lng: longitude }
        : { lat: 35.6812, lng: 139.7671 }; // デフォルト: 東京駅

    return (
        <div className="relative h-[60vh] w-full bg-gray-100">
            {/* Google Maps は別途セットアップが必要 — 仮のプレースホルダー */}
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400">
                <p className="text-sm">マップ表示</p>
                <p className="text-xs">中心: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}</p>
                <p className="text-xs">{shops.length} 件のお店</p>
            </div>
        </div>
    );
}
