"use client";
import { useState, useMemo } from "react";
import { Avatar } from "@/components/ui";
import { StoryViewer } from "./story-viewer";
import type { InstagramStory, Restaurant } from "@/types/database";

type StoryWithShop = InstagramStory & { shop: Pick<Restaurant, "id" | "name" | "main_image"> };

interface StoryBarProps {
    stories: StoryWithShop[];
}

export function StoryBar({ stories }: StoryBarProps) {
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);

    // 店舗ごとにグルーピング
    const groupedStories = useMemo(() => {
        const map = new Map<string, StoryWithShop[]>();
        for (const story of stories) {
            const existing = map.get(story.shop_id) ?? [];
            existing.push(story);
            map.set(story.shop_id, existing);
        }
        return Array.from(map.entries()).map(([shopId, items]) => ({
            shopId,
            shop: items[0].shop,
            stories: items,
        }));
    }, [stories]);

    return (
        <>
            <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
                {groupedStories.map((group, i) => (
                    <button
                        key={group.shopId}
                        onClick={() => setViewerIndex(i)}
                        className="flex flex-col items-center gap-1"
                    >
                        <div className="rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 p-0.5">
                            <div className="rounded-full bg-white p-0.5">
                                <Avatar src={group.shop.main_image} alt={group.shop.name} size={56} />
                            </div>
                        </div>
                        <span className="w-16 truncate text-center text-xs text-gray-700">{group.shop.name}</span>
                    </button>
                ))}
            </div>

            {viewerIndex !== null && (
                <StoryViewer
                    groups={groupedStories}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerIndex(null)}
                />
            )}
        </>
    );
}
