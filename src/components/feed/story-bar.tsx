"use client";

import { cn } from "@/lib/utils";
import type { Shop, InstagramStory } from "@/types/database";

type StoryItem = {
  shop: Shop;
  stories: InstagramStory[];
  hasUnread: boolean;
};

type StoryBarProps = {
  items: StoryItem[];
  onStoryClick: (shopIndex: number) => void;
};

export function StoryBar({ items, onStoryClick }: StoryBarProps) {
  if (items.length === 0) return null;

  return (
    <div className="border-b border-gray-100 px-4 py-3">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {items.map((item, index) => (
          <button
            key={item.shop.id}
            onClick={() => onStoryClick(index)}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-full p-0.5",
                item.hasUnread
                  ? "bg-orange-500"
                  : "bg-gray-300"
              )}
            >
              <div className="size-full overflow-hidden rounded-full border-2 border-white bg-gray-200">
                {item.shop.main_image && (
                  <img
                    src={item.shop.main_image}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </div>
            </div>
            <span className="w-14 truncate text-center text-[10px] text-gray-700">
              {item.shop.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
