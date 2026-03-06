"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, Filter, Navigation, MapPin } from "lucide-react";
import { useLocationStore } from "@/store";
import Link from "next/link";
import Image from "next/image";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant } from "@/types/database";

const containerStyle = {
    width: "100%",
    height: "100%",
};

export default function DiscoverPage() {
    const { latitude, longitude, isLoading, setLocation, setLoading, setError } = useLocationStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [shops, setShops] = useState<Restaurant[]>([]);
    const supabase = createClient();
    const mapRef = useRef<google.maps.Map | null>(null);
    const [selectedShop, setSelectedShop] = useState<Restaurant | null>(null);
    const [selectedGenre, setSelectedGenre] = useState<string>("すべて");
    const [showOnlyOpen, setShowOnlyOpen] = useState(false);

    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        language: "ja",
        region: "JP",
    });

    // 店舗データを取得
    useEffect(() => {
        const fetchShops = async () => {
            const { data, error } = await supabase.from("shops").select("*");
            if (data && !error) {
                setShops(data as Restaurant[]);
            }
        };
        fetchShops();
    }, [supabase]);

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
                    () => {
                        setError("位置情報を取得できませんでした。");
                        setLoading(false);
                        setLocation(32.8032, 130.7079);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0,
                    }
                );
            } else {
                setError("お使いのブラウザは位置情報に対応していません。");
                setLoading(false);
                setLocation(32.8032, 130.7079);
            }
        }
    }, [latitude, longitude, isLoading, setLocation, setLoading, setError]);

    const availableGenres = useMemo(() => {
        const genres = new Set<string>();
        shops.forEach((shop) => {
            if (shop.genre) genres.add(shop.genre);
        });
        return ["すべて", ...Array.from(genres)];
    }, [shops]);

    const filteredShops = useMemo(() => {
        return shops.filter((shop) => {
            const hasCoords = Boolean(shop.latitude && shop.longitude);
            const matchQuery = searchQuery === "" || shop.name.includes(searchQuery) || (shop.genre && shop.genre.includes(searchQuery));
            const matchGenre = selectedGenre === "すべて" || shop.genre === selectedGenre;
            const matchStatus = !showOnlyOpen || shop.is_open;
            return hasCoords && matchQuery && matchGenre && matchStatus;
        });
    }, [shops, searchQuery, selectedGenre, showOnlyOpen]);

    const getPinIconUrl = (genre: string) => {
        let color = "#FF6B35";
        if (!genre) color = "#FF6B35";
        else if (genre.includes("カフェ") || genre.includes("喫茶")) color = "#8B4513";
        else if (genre.includes("居酒屋")) color = "#1E3A8A";
        else if (genre.includes("バー") || genre.includes("Bar")) color = "#6B21A8";
        else if (genre.includes("焼き鳥") || genre.includes("焼鳥") || genre.includes("焼肉")) color = "#991B1B";
        else if (genre.includes("ラーメン") || genre.includes("中華")) color = "#D97706";
        else if (genre.includes("寿司") || genre.includes("海鮮") || genre.includes("魚")) color = "#0369A1";

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
        if (filteredShops.length > 0) {
            const bounds = new window.google.maps.LatLngBounds();
            let hasValidCoords = false;
            filteredShops.forEach(shop => {
                if (shop.latitude && shop.longitude) {
                    bounds.extend({ lat: shop.latitude, lng: shop.longitude });
                    hasValidCoords = true;
                }
            });
            if (hasValidCoords) {
                map.fitBounds(bounds);
            }
        }
    }, [filteredShops]);

    const onUnmount = useCallback(function callback() {
        mapRef.current = null;
    }, []);

    const moveToLocation = (lat: number, lng: number, zoom: number = 15) => {
        if (mapRef.current) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(zoom);
        }
    };

    return (
        <div className="flex h-[calc(100dvh-7.5rem)] flex-col">
            {/* 検索バー */}
            <div className="border-b border-gray-200 bg-white px-4 py-3 z-10 shadow-sm relative">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
                        <input
                            placeholder="エリア・店名で検索"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-colors ${showFilters ? "border-orange-500 bg-orange-50 text-orange-500" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}
                        aria-label="フィルター"
                    >
                        <Filter className="size-5" />
                    </button>
                </div>

                {/* フィルターパネル */}
                {showFilters && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setShowOnlyOpen(!showOnlyOpen)}
                            className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${showOnlyOpen ? "bg-orange-100 text-orange-600 border border-orange-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            {showOnlyOpen ? "営業中のみ" : "すべての店舗"}
                        </button>

                        <select
                            value={selectedGenre}
                            onChange={(e) => setSelectedGenre(e.target.value)}
                            className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600 font-bold border-none outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            {availableGenres.map((genre) => (
                                <option key={genre} value={genre}>{genre}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* 地図エリア */}
            <div className="relative flex-1 bg-gray-200">
                {!isLoaded || (isLoading && !latitude) ? (
                    <div className="flex size-full items-center justify-center bg-blue-50/50">
                        <div className="text-center">
                            <div className="mx-auto mb-2 size-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                            <p className="text-sm font-bold text-gray-600">マップを読み込み中...</p>
                        </div>
                    </div>
                ) : (
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={{ lat: latitude || 32.8032, lng: longitude || 130.7079 }}
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
                                        <h3 className="font-bold text-gray-800 text-sm">{selectedShop.name}</h3>
                                        <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedShop.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {selectedShop.is_open ? '営業中' : '準備中'}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{selectedShop.genre}</p>
                                    <Link
                                        href={`/shop/${selectedShop.id}`}
                                        className="inline-flex min-h-[36px] w-full items-center justify-center rounded bg-orange-500 px-3 text-xs font-bold text-white transition-colors hover:bg-orange-600"
                                    >
                                        お店を見る
                                    </Link>
                                </div>
                            </InfoWindow>
                        )}

                        {/* 現在地マーカー */}
                        {latitude && longitude && (
                            <Marker
                                position={{ lat: latitude, lng: longitude }}
                                icon={{
                                    url: "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233B82F6' stroke='white' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Ccircle cx='12' cy='12' r='4' fill='white'%3E%3C/circle%3E%3C/svg%3E",
                                    scaledSize: new window.google.maps.Size(24, 24),
                                }}
                                zIndex={999}
                            />
                        )}
                    </GoogleMap>
                )}

                {/* 現在地ボタン */}
                <button
                    className="absolute bottom-4 right-4 z-10 flex size-12 items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-105"
                    onClick={() => {
                        setLoading(true);
                        if ("geolocation" in navigator) {
                            navigator.geolocation.getCurrentPosition(
                                (position) => {
                                    const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                                    setLocation(pos.lat, pos.lng);
                                    moveToLocation(pos.lat, pos.lng, 15);
                                    setLoading(false);
                                },
                                () => setLoading(false)
                            );
                        }
                    }}
                    aria-label="現在地に移動"
                >
                    <Navigation className="size-5 text-orange-500" />
                </button>
            </div>

            {/* 店舗リスト（横スクロール） */}
            <div className="border-t border-gray-200 bg-white relative z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex gap-3 overflow-x-auto px-4 py-3 pb-4">
                    {filteredShops.length > 0 ? (
                        filteredShops.slice(0, 10).map((shop) => (
                            <Link
                                href={`/shop/${shop.id}`}
                                key={shop.id}
                                className="flex w-64 flex-shrink-0 items-center gap-3 rounded-xl bg-gray-50 p-3 hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-100"
                                onClick={() => moveToLocation(shop.latitude, shop.longitude, 16)}
                            >
                                <div className="size-14 flex-shrink-0 rounded-lg bg-gray-200 overflow-hidden relative">
                                    {shop.atmosphere_photos && shop.atmosphere_photos.length > 0 ? (
                                        <Image src={shop.atmosphere_photos[0]} alt={shop.name} fill className="object-cover" sizes="56px" />
                                    ) : (
                                        <div className="flex size-full items-center justify-center text-gray-400 text-xs">
                                            <MapPin className="size-5" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="truncate font-bold text-sm text-gray-800">
                                        {shop.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 truncate">{shop.genre}</p>
                                    <div className="mt-1 flex items-center">
                                        <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${shop.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {shop.is_open ? '営業中' : '準備中'}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="flex w-full items-center justify-center py-4 text-sm text-gray-500 font-bold">
                            お店が見つかりません
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
