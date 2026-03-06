"use client";

import { useCallback, useRef } from "react";
import { Navigation } from "lucide-react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import Link from "next/link";
import { useLocationStore } from "@/store";
import { SeatBadge } from "./SeatBadge";
import type { Restaurant, SeatStatus } from "@/types/database";

const containerStyle = {
  width: "100%",
  height: "100%",
};

/**
 * ジャンル別のピンアイコンSVGを生成
 */
function getPinIconUrl(genre: string): string {
  let color = "#FF6B35";
  if (!genre) color = "#FF6B35";
  else if (genre.includes("カフェ") || genre.includes("喫茶")) color = "#8B4513";
  else if (genre.includes("居酒屋")) color = "#1E3A8A";
  else if (genre.includes("バー") || genre.includes("Bar")) color = "#6B21A8";
  else if (genre.includes("焼き鳥") || genre.includes("焼鳥") || genre.includes("焼肉"))
    color = "#991B1B";
  else if (genre.includes("ラーメン") || genre.includes("中華")) color = "#D97706";
  else if (genre.includes("寿司") || genre.includes("海鮮") || genre.includes("魚"))
    color = "#0369A1";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3" fill="white"></circle>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** 現在地マーカーのSVG */
const CURRENT_LOCATION_ICON =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233B82F6' stroke='white' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Ccircle cx='12' cy='12' r='4' fill='white'%3E%3C/circle%3E%3C/svg%3E";

interface MapViewProps {
  shops: Restaurant[];
  seatStatusMap: Map<string, SeatStatus>;
  isMapLoaded: boolean;
  selectedShop: Restaurant | null;
  onSelectShop: (shop: Restaurant | null) => void;
}

/**
 * 地図ビューコンポーネント
 * Google Maps にレストランのピンを表示し、タップでミニカードを開く
 */
export function MapView({
  shops,
  seatStatusMap,
  isMapLoaded,
  selectedShop,
  onSelectShop,
}: MapViewProps) {
  const { latitude, longitude, isLoading, setLocation, setLoading } =
    useLocationStore();
  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (shops.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        let hasValidCoords = false;
        shops.forEach((shop) => {
          if (shop.latitude && shop.longitude) {
            bounds.extend({ lat: shop.latitude, lng: shop.longitude });
            hasValidCoords = true;
          }
        });
        if (hasValidCoords) {
          map.fitBounds(bounds);
        }
      }
    },
    [shops]
  );

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const moveToLocation = (lat: number, lng: number, zoom: number = 15) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(zoom);
    }
  };

  const handleCurrentLocation = () => {
    setLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(pos.lat, pos.lng);
          moveToLocation(pos.lat, pos.lng, 15);
          setLoading(false);
        },
        () => setLoading(false)
      );
    }
  };

  // ローディング中
  if (!isMapLoaded || (isLoading && !latitude)) {
    return (
      <div className="flex size-full items-center justify-center bg-blue-50/50">
        <div className="text-center">
          <div className="mx-auto mb-2 size-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-sm font-bold text-gray-600">
            マップを読み込み中...
          </p>
        </div>
      </div>
    );
  }

  const seatStatus = selectedShop
    ? seatStatusMap.get(selectedShop.id)
    : undefined;

  return (
    <>
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
        {/* 店舗マーカー */}
        {shops.map((shop) => (
          <Marker
            key={shop.id}
            position={{ lat: shop.latitude, lng: shop.longitude }}
            icon={{
              url: getPinIconUrl(shop.genre),
              scaledSize: new window.google.maps.Size(40, 40),
            }}
            onClick={() => onSelectShop(shop)}
          />
        ))}

        {/* InfoWindow（選択中の店舗） */}
        {selectedShop && (
          <InfoWindow
            position={{
              lat: selectedShop.latitude,
              lng: selectedShop.longitude,
            }}
            onCloseClick={() => onSelectShop(null)}
          >
            <div className="max-w-[200px] p-2">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-800">
                  {selectedShop.name}
                </h3>
              </div>
              {seatStatus && (
                <div className="mb-1">
                  <SeatBadge status={seatStatus.status} />
                </div>
              )}
              <p className="mb-2 line-clamp-2 text-xs text-gray-500">
                {selectedShop.genre}
              </p>
              <Link
                href={`/shop/${selectedShop.id}`}
                className="inline-flex min-h-9 w-full items-center justify-center rounded bg-orange-500 px-3 text-xs font-bold text-white transition-colors hover:bg-orange-600"
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
              url: CURRENT_LOCATION_ICON,
              scaledSize: new window.google.maps.Size(24, 24),
            }}
            zIndex={999}
          />
        )}
      </GoogleMap>

      {/* 現在地ボタン */}
      <button
        className="absolute bottom-4 right-4 z-10 flex size-12 items-center justify-center rounded-full bg-white shadow-lg"
        onClick={handleCurrentLocation}
        aria-label="現在地に移動"
      >
        <Navigation className="size-5 text-orange-500" />
      </button>
    </>
  );
}
