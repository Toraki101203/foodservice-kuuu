"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;

type ScrollPickerProps = {
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function ScrollPicker({ items, value, onChange, className }: ScrollPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 値からインデックスを取得
  const selectedIndex = items.findIndex((item) => item.value === value);

  // スクロール位置から選択インデックスを計算
  const getIndexFromScroll = useCallback(
    (scrollTop: number) => {
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      return Math.max(0, Math.min(items.length - 1, index));
    },
    [items.length]
  );

  // 指定インデックスにスクロール
  const scrollToIndex = useCallback((index: number, smooth = false) => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  // 初期スクロール位置を設定
  useEffect(() => {
    if (selectedIndex >= 0) {
      scrollToIndex(selectedIndex);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // value が外部から変更された場合にスクロール同期
  useEffect(() => {
    if (!isUserScrolling.current && selectedIndex >= 0) {
      scrollToIndex(selectedIndex, true);
    }
  }, [selectedIndex, scrollToIndex]);

  // スクロールイベントハンドラ
  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const index = getIndexFromScroll(container.scrollTop);
      scrollToIndex(index, true);

      const newValue = items[index]?.value;
      if (newValue && newValue !== value) {
        onChange(newValue);
      }
      isUserScrolling.current = false;
    }, 80);
  }, [items, value, onChange, getIndexFromScroll, scrollToIndex]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  const paddingItems = Math.floor(VISIBLE_COUNT / 2);

  return (
    <div
      className={cn("relative", className)}
      style={{ height: ITEM_HEIGHT * VISIBLE_COUNT }}
    >
      {/* 選択行ハイライト */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 rounded-lg border-y border-orange-200 bg-orange-50/50"
        style={{
          top: ITEM_HEIGHT * paddingItems,
          height: ITEM_HEIGHT,
        }}
      />

      {/* 上下フェード */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-white to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-white to-transparent" />

      {/* スクロールコンテナ */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="size-full snap-y snap-mandatory overflow-y-auto scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {/* 上パディング */}
        {Array.from({ length: paddingItems }).map((_, i) => (
          <div key={`pad-top-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}

        {/* アイテム */}
        {items.map((item) => (
          <div
            key={item.value}
            className="flex items-center justify-center snap-center text-sm tabular-nums text-gray-900"
            style={{ height: ITEM_HEIGHT }}
          >
            <span
              className={cn(
                "transition-all",
                item.value === value
                  ? "text-base font-bold text-orange-600"
                  : "text-sm text-gray-400"
              )}
            >
              {item.label}
            </span>
          </div>
        ))}

        {/* 下パディング */}
        {Array.from({ length: paddingItems }).map((_, i) => (
          <div key={`pad-bottom-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
      </div>
    </div>
  );
}
