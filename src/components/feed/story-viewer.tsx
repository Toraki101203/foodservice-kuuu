"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { SeatBadge } from "@/components/ui/seat-badge";
import { formatRemainingTime } from "@/lib/format";
import type { Shop, InstagramStory, SeatStatus } from "@/types/database";

type StoryViewerProps = {
  shops: Array<{
    shop: Shop & { seat_status: SeatStatus[] };
    stories: InstagramStory[];
  }>;
  initialShopIndex: number;
  onClose: () => void;
};

export function StoryViewer({ shops, initialShopIndex, onClose }: StoryViewerProps) {
  const [shopIndex, setShopIndex] = useState(initialShopIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const currentShop = shops[shopIndex];
  const currentStory = currentShop?.stories[storyIndex];
  const seatStatus = currentShop?.shop.seat_status?.[0];

  const goNext = useCallback(() => {
    if (!currentShop) return;
    if (storyIndex < currentShop.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (shopIndex < shops.length - 1) {
      setShopIndex((prev) => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentShop, storyIndex, shopIndex, shops.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (shopIndex > 0) {
      setShopIndex((prev) => prev - 1);
      setStoryIndex(0);
      setProgress(0);
    }
  }, [storyIndex, shopIndex]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goNext();
          return 0;
        }
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [goNext]);

  if (!currentShop || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* プログレスバー */}
      <div className="absolute top-0 right-0 left-0 z-10 flex gap-1 p-2">
        {currentShop.stories.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full bg-white transition-all"
              style={{
                width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* ヘッダー: 店舗情報 + 閉じるボタン */}
      <div className="absolute top-4 right-0 left-0 z-10 flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="size-8 overflow-hidden rounded-full bg-gray-600">
            {currentShop.shop.main_image && (
              <img src={currentShop.shop.main_image} alt="" className="size-full object-cover" />
            )}
          </div>
          <span className="text-sm font-bold text-white">{currentShop.shop.name}</span>
          <span className="text-xs text-white/60">
            {formatRemainingTime(currentStory.expires_at)}
          </span>
        </div>
        <button onClick={onClose} aria-label="閉じる" className="p-2">
          <X className="size-6 text-white" />
        </button>
      </div>

      {/* ストーリー画像 */}
      <img
        src={currentStory.media_url}
        alt=""
        className="size-full object-contain"
      />

      {/* タップ操作エリア: 左1/3=前、右1/3=次 */}
      <button
        onClick={goPrev}
        className="absolute top-0 left-0 h-full w-1/3"
        aria-label="前のストーリー"
      />
      <button
        onClick={goNext}
        className="absolute top-0 right-0 h-full w-1/3"
        aria-label="次のストーリー"
      />

      {/* 下部: 空席バッジ + 店舗リンク */}
      <div className="absolute bottom-0 right-0 left-0 z-10 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
        {seatStatus && <SeatBadge status={seatStatus.status} />}
        <Link
          href={`/shop/${currentShop.shop.id}`}
          onClick={onClose}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-900"
        >
          店舗を見る
        </Link>
      </div>
    </div>
  );
}
