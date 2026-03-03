"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Restaurant } from "@/types/database";
import Link from "next/link";

// Leafletのデフォルトアイコン問題を修正
const defaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

const userIcon = L.divIcon({
    className: "",
    html: `<div style="background:#3B82F6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

// ジャンル別ピンカラー
function getGenreColor(genre: string): string {
    if (!genre) return "#FF6B35";
    if (genre.includes("カフェ") || genre.includes("喫茶")) return "#8B4513";
    if (genre.includes("居酒屋")) return "#1E3A8A";
    if (genre.includes("バー") || genre.includes("Bar")) return "#6B21A8";
    if (genre.includes("焼き鳥") || genre.includes("焼鳥") || genre.includes("焼肉")) return "#991B1B";
    if (genre.includes("ラーメン") || genre.includes("中華")) return "#D97706";
    if (genre.includes("寿司") || genre.includes("海鮮") || genre.includes("魚")) return "#0369A1";
    return "#FF6B35";
}

function createShopIcon(genre: string) {
    const color = getGenreColor(genre);
    return L.divIcon({
        className: "",
        html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
            <div style="width:8px;height:8px;background:white;border-radius:50%"></div>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
    });
}

// 地図の中心を動的に変更するコンポーネント
function RecenterMap({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

interface MapViewProps {
    shops: Restaurant[];
    center: [number, number];
    userLocation: [number, number] | null;
}

export default function MapView({ shops, center, userLocation }: MapViewProps) {
    return (
        <MapContainer
            center={center}
            zoom={14}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap center={center} />

            {/* 店舗マーカー */}
            {shops.map((shop) => (
                <Marker
                    key={shop.id}
                    position={[shop.latitude!, shop.longitude!]}
                    icon={createShopIcon(shop.genre)}
                >
                    <Popup>
                        <div className="min-w-[180px] p-1">
                            <h3 className="font-bold text-sm text-gray-800 mb-1">{shop.name}</h3>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-500">{shop.genre}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${shop.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {shop.is_open ? '営業中' : '準備中'}
                                </span>
                            </div>
                            <Link
                                href={`/shop/${shop.id}`}
                                className="mt-1 block rounded-lg bg-orange-500 px-3 py-1.5 text-center text-xs font-bold text-white hover:bg-orange-600"
                            >
                                お店を見る
                            </Link>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* 現在地マーカー */}
            {userLocation && (
                <Marker position={userLocation} icon={userIcon} />
            )}
        </MapContainer>
    );
}
