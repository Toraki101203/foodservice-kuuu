"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { SeatBadge } from "@/components/ui/seat-badge";
import { formatRelativeTime } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import type { InstagramPost, Shop, SeatStatus } from "@/types/database";

type FeedCardProps = {
  post: InstagramPost & { shop: Shop & { seat_status: SeatStatus[] } };
  distance?: string;
  onPostClick?: (genre: string | null) => void;
};

export function FeedCard({ post, distance, onPostClick }: FeedCardProps) {
  const shop = post.shop;
  const seatStatus = shop.seat_status?.[0];
  const articleRef = useRef<HTMLElement>(null);
  const trackedRef = useRef(false);

  // IntersectionObserver: 投稿がフィードに表示されたら post_impression を記録
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !trackedRef.current) {
          trackedRef.current = true;
          trackEvent(shop.id, "post_impression", { post_id: post.id });
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shop.id, post.id]);

  return (
    <article ref={articleRef} className="border-b border-gray-100 pb-4">
      {/* ヘッダー: 店舗アイコン・名前・ジャンル・空席バッジ */}
      <div className="flex items-center justify-between px-4 py-2">
        <Link href={`/shop/${shop.id}`} className="flex items-center gap-2">
          <div className="size-10 overflow-hidden rounded-lg bg-gray-200">
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
      <Link href={`/shop/${shop.id}/post/${post.id}`} onClick={() => onPostClick?.(shop.genre)}>
        {post.image_url && (
          <img
            src={post.image_url}
            alt={post.caption ?? ""}
            className="w-full object-cover"
            loading="lazy"
          />
        )}
      </Link>

      {/* キャプション */}
      <div className="px-4 pt-2">
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
