"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { SeatBadge } from "./SeatBadge";
import type { Restaurant, SeatStatus, InstagramPost } from "@/types/database";

interface RestaurantCardProps {
  restaurant: Restaurant;
  seatStatus: SeatStatus | undefined;
  instagramPost: InstagramPost | undefined;
  distance: number | null;
}

/**
 * リストビュー用の店舗カード
 * 写真（Instagram優先 → atmosphere_photos fallback）、名前、ジャンル、空席バッジ、距離を表示
 */
export function RestaurantCard({
  restaurant,
  seatStatus,
  instagramPost,
  distance,
}: RestaurantCardProps) {
  // 表示用画像URL: Instagram投稿 > 雰囲気写真 > なし
  const imageUrl =
    instagramPost?.image_url ??
    (restaurant.atmosphere_photos && restaurant.atmosphere_photos.length > 0
      ? restaurant.atmosphere_photos[0]
      : null);

  // 距離のフォーマット
  const formattedDistance =
    distance !== null
      ? distance < 1
        ? `${Math.round(distance * 1000)}m`
        : `${distance.toFixed(1)}km`
      : null;

  return (
    <Link
      href={`/shop/${restaurant.id}`}
      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 transition-colors hover:border-orange-100 hover:bg-orange-50/50"
    >
      {/* サムネイル画像 */}
      <div className="relative size-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={restaurant.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-gray-300">
            <MapPin className="size-6" />
          </div>
        )}
      </div>

      {/* 店舗情報 */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-sm font-bold text-gray-800 text-balance">
          {restaurant.name}
        </h3>
        <p className="truncate text-xs text-gray-500 text-pretty">
          {restaurant.genre}
        </p>
        <div className="flex items-center gap-2">
          {seatStatus && <SeatBadge status={seatStatus.status} />}
          {formattedDistance && (
            <span className="text-xs text-gray-400">{formattedDistance}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
