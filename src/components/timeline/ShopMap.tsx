"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import type { Post, Restaurant } from "@/types/database";
import Link from "next/link";
import { Utensils, Coffee, Beer, MapPin, Navigation, Compass, Filter } from "lucide-react";

type PostWithShop = Post & {
    shop: Restaurant;
};

interface ShopMapProps {
    posts: PostWithShop[];
}

const containerStyle = {
    width: "100%",
    height: "100dvh",
    paddingBottom: "80px", // BottomNavの高さ分の余白
};

// 天神周辺をデフォルトの中心にする（実際のアプリではGeolocation APIを使用）
const defaultCenter = {
    lat: 33.5902,
    lng: 130.3959,
};

export default function ShopMap({ posts }: ShopMapProps) {
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        language: "ja",
        region: "JP",
    });

    const [selectedShop, setSelectedShop] = useState<Restaurant | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedGenre, setSelectedGenre] = useState<string>("すべて");
    const [showOnlyOpen, setShowOnlyOpen] = useState<boolean>(false);

    // 重複する店舗をまとめる（複数投稿があってもピンは1つ）
    const uniqueShops = useMemo(() => {
        const shopsMap = new Map<string, Restaurant>();
        posts.forEach((post) => {
            if (post.shop.latitude && post.shop.longitude && !shopsMap.has(post.shop.id)) {
                shopsMap.set(post.shop.id, post.shop);
            }
        });
        return Array.from(shopsMap.values());
    }, [posts]);

    // 存在するジャンルのリストを抽出
    const availableGenres = useMemo(() => {
        const genres = new Set<string>();
        uniqueShops.forEach((shop) => {
            if (shop.genre) genres.add(shop.genre);
        });
        return ["すべて", ...Array.from(genres)];
    }, [uniqueShops]);

    // フィルター適用後の店舗リスト
    const filteredShops = useMemo(() => {
        return uniqueShops.filter((shop) => {
            const matchGenre = selectedGenre === "すべて" || shop.genre === selectedGenre;
            const matchStatus = !showOnlyOpen || shop.is_open;
            return matchGenre && matchStatus;
        });
    }, [uniqueShops, selectedGenre, showOnlyOpen]);

    const getPinIconUrl = (genre: string) => {
        // SVGピンアイコンのデータURIを生成（ジャンルに応じて色を変える）
        let color = "#FF6B35"; // デフォルト（Kuuuオレンジ）
        if (genre.includes("カフェ") || genre.includes("喫茶")) color = "#8B4513"; // 茶色
        else if (genre.includes("居酒屋")) color = "#1E3A8A"; // 濃い青
        else if (genre.includes("バー") || genre.includes("Bar")) color = "#6B21A8"; // 紫
        else if (genre.includes("焼き鳥") || genre.includes("焼鳥") || genre.includes("焼肉")) color = "#991B1B"; // 濃い赤・えんじ色
        else if (genre.includes("ラーメン") || genre.includes("中華")) color = "#D97706"; // 黄金色・オレンジ系
        else if (genre.includes("寿司") || genre.includes("海鮮") || genre.includes("魚")) color = "#0369A1"; // 青・シアン系

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3" fill="white"></circle>
            </svg>
        `;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    };

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        mapRef.current = map;
        // boundsを計算して全ピンが収まるようにする
        if (filteredShops.length > 0) {
            const bounds = new window.google.maps.LatLngBounds();
            filteredShops.forEach(shop => {
                if (shop.latitude && shop.longitude) {
                    bounds.extend({ lat: shop.latitude, lng: shop.longitude });
                }
            });
            map.fitBounds(bounds);
        }
    }, [filteredShops]);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        mapRef.current = null;
    }, []);

    const moveToLocation = (lat: number, lng: number, zoom: number = 15) => {
        if (mapRef.current) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(zoom);
        }
    };

    const handleCurrentLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setUserLocation(pos);
                    moveToLocation(pos.lat, pos.lng, 15);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    alert("現在地の取得に失敗しました。端末の位置情報設定を確認してください。");
                }
            );
        } else {
            alert("お使いのブラウザは位置情報取得に対応していません。");
        }
    };

    if (!isLoaded) return <div className="flex h-[100dvh] w-full items-center justify-center bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">マップを読み込み中...</div>;

    return (
        <div className="relative h-[100dvh] w-full overflow-hidden">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={defaultCenter}
                zoom={14}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                }}
            >
                {filteredShops.map((shop) => (
                    <Marker
                        key={shop.id}
                        position={{ lat: shop.latitude!, lng: shop.longitude! }}
                        icon={{
                            url: getPinIconUrl(shop.genre),
                            scaledSize: new window.google.maps.Size(40, 40),
                        }}
                        onClick={() => setSelectedShop(shop)}
                    />
                ))}

                {selectedShop && (
                    <InfoWindow
                        position={{ lat: selectedShop.latitude!, lng: selectedShop.longitude! }}
                        onCloseClick={() => setSelectedShop(null)}
                    >
                        <div className="p-2 max-w-[200px]">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-[var(--color-text-primary)] text-sm">{selectedShop.name}</h3>
                                <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedShop.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {selectedShop.is_open ? '営業中' : '準備中'}
                                </div>
                            </div>
                            <p className="text-xs text-[var(--color-text-secondary)] mb-2 line-clamp-2">{selectedShop.genre}</p>
                            <Link
                                href={`/reservation/${selectedShop.id}`}
                                className="inline-flex min-h-[36px] w-full items-center justify-center rounded bg-[var(--color-primary)] px-3 text-xs font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                            >
                                予約画面へ
                            </Link>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* フィルターコントロール群 */}
            <div className="absolute top-24 right-4 flex flex-col items-end gap-2 z-10 w-48">
                <div className="flex w-full items-center gap-2 rounded-xl bg-white/90 p-2 shadow-md backdrop-blur-sm">
                    <Filter className="size-4 text-[var(--color-text-secondary)]" />
                    <select
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                        className="flex-1 bg-transparent text-sm font-bold text-[var(--color-text-primary)] focus:outline-none"
                    >
                        {availableGenres.map((genre) => (
                            <option key={genre} value={genre}>
                                {genre}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => setShowOnlyOpen(!showOnlyOpen)}
                    className={`flex w-full items-center justify-between rounded-xl p-2 px-3 text-sm font-bold shadow-md backdrop-blur-sm transition-colors ${showOnlyOpen
                            ? "bg-[var(--color-success)] text-white"
                            : "bg-white/90 text-[var(--color-text-secondary)]"
                        }`}
                >
                    <span>営業中のみ表示</span>
                    <div
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out ${showOnlyOpen ? 'bg-white/30' : 'bg-gray-200'
                            }`}
                        role="switch"
                        aria-checked={showOnlyOpen}
                    >
                        <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showOnlyOpen ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                        />
                    </div>
                </button>
            </div>

            {/* エリアジャンプボタン群 */}
            <div className="absolute top-24 left-4 flex flex-col gap-2 z-10">
                <button
                    onClick={() => moveToLocation(33.5902, 130.3959, 15)}
                    className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[var(--color-text-primary)] shadow-md backdrop-blur-sm transition-transform hover:scale-105"
                >
                    <Compass className="size-3 text-[var(--color-primary)]" />
                    天神
                </button>
                <button
                    onClick={() => moveToLocation(33.5864, 130.3946, 16)}
                    className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[var(--color-text-primary)] shadow-md backdrop-blur-sm transition-transform hover:scale-105"
                >
                    <Compass className="size-3 text-[var(--color-primary)]" />
                    大名
                </button>
                <button
                    onClick={() => moveToLocation(33.5897, 130.4207, 15)}
                    className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[var(--color-text-primary)] shadow-md backdrop-blur-sm transition-transform hover:scale-105"
                >
                    <Compass className="size-3 text-[var(--color-primary)]" />
                    博多
                </button>
            </div>

            {/* 現在地ボタン */}
            <button
                onClick={handleCurrentLocation}
                className="absolute bottom-28 right-4 z-10 flex size-12 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-lg transition-transform hover:scale-105"
                aria-label="現在地に戻る"
            >
                <Navigation className="size-6" />
            </button>
        </div>
    );
}
