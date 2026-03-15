"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SeatBadge } from "@/components/ui/seat-badge";
import { formatRelativeTime } from "@/lib/utils";
import type { InstagramPost, Shop, SeatStatus } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

type FeedCardProps = {
  post: InstagramPost & { shop: Shop & { seat_status: SeatStatus[] } };
  isFavorited?: boolean;
  distance?: string;
};

export function FeedCard({ post, isFavorited = false, distance }: FeedCardProps) {
  const [liked, setLiked] = useState(isFavorited);
  const shop = post.shop;
  const seatStatus = shop.seat_status?.[0];

  const toggleFavorite = async () => {
    const prev = liked;
    setLiked(!liked);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (prev) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("shop_id", shop.id);
      if (error) setLiked(prev);
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, shop_id: shop.id });
      if (error) setLiked(prev);
    }
  };

  return (
    <article className="border-b border-gray-100 pb-4">
      {/* ヘッダー: 店舗アイコン・名前・ジャンル・空席バッジ */}
      <div className="flex items-center justify-between px-4 py-2">
        <Link href={`/shop/${shop.id}`} className="flex items-center gap-2">
          <div className="size-8 overflow-hidden rounded-full bg-gray-200">
            {shop.main_image && (
              <img src={shop.main_image} alt="" className="size-full object-cover" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{shop.name}</p>
            <p className="text-xs text-gray-500">{shop.genre} {distance && `· ${distance}`}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {seatStatus && <SeatBadge status={seatStatus.status} />}
          <span className="text-xs text-gray-400">
            {post.posted_at ? formatRelativeTime(post.posted_at) : ""}
          </span>
        </div>
      </div>

      {/* 投稿画像 */}
      <Link href={`/shop/${shop.id}`}>
        {post.image_url && (
          <img
            src={post.image_url}
            alt={post.caption ?? ""}
            className="w-full object-cover"
            loading="lazy"
          />
        )}
      </Link>

      {/* アクション + キャプション */}
      <div className="px-4 pt-2">
        <button
          onClick={toggleFavorite}
          aria-label={liked ? "お気に入りから削除" : "お気に入りに追加"}
          className="mb-1 p-1"
        >
          <Heart
            className={cn("size-6", liked ? "fill-red-500 text-red-500" : "text-gray-600")}
          />
        </button>
        {post.caption && (
          <p className="text-sm leading-relaxed text-gray-700 text-pretty">
            <Link href={`/shop/${shop.id}`} className="mr-1 font-bold text-gray-900">
              {shop.name}
            </Link>
            {post.caption.length > 100
              ? `${post.caption.slice(0, 100)}...`
              : post.caption}
          </p>
        )}
      </div>
    </article>
  );
}
