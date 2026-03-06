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
 * フィード形式の店舗カード
 * Instagram風の縦型レイアウト: ヘッダー（店名+空席）→ 画像 → 情報
 */
export function RestaurantCard({
  restaurant,
  seatStatus,
  instagramPost,
  distance,
}: RestaurantCardProps) {
  const imageUrl =
    instagramPost?.image_url ??
    (restaurant.atmosphere_photos && restaurant.atmosphere_photos.length > 0
      ? restaurant.atmosphere_photos[0]
      : null);

  const formattedDistance =
    distance !== null
      ? distance < 1
        ? `${Math.round(distance * 1000)}m`
        : `${distance.toFixed(1)}km`
      : null;

  return (
    <Link
      href={`/shop/${restaurant.id}`}
      className="block bg-white"
    >
      {/* ヘッダー: 店名 + 空席 */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
            {restaurant.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-gray-800">
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>{restaurant.genre}</span>
              {formattedDistance && (
                <>
                  <span>·</span>
                  <span>{formattedDistance}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {seatStatus && <SeatBadge status={seatStatus.status} />}
      </div>

      {/* メイン画像 */}
      {imageUrl ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
          <Image
            src={imageUrl}
            alt={restaurant.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 512px"
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-gray-50">
          <MapPin className="size-10 text-gray-200" />
        </div>
      )}

      {/* フッター情報 */}
      {(restaurant.address || instagramPost?.caption) && (
        <div className="px-4 py-2.5">
          {instagramPost?.caption && (
            <p className="line-clamp-2 text-sm text-gray-600 leading-relaxed text-pretty">
              {instagramPost.caption}
            </p>
          )}
          {restaurant.address && !instagramPost?.caption && (
            <p className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="size-3.5" />
              <span className="truncate">{restaurant.address}</span>
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
