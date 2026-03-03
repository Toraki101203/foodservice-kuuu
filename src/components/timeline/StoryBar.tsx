"use client";

import { useState } from "react";
import Image from "next/image";
import type { Restaurant, Story } from "@/types/database";
import StoryViewer from "./StoryViewer";

export interface ShopWithStories {
    shop: Restaurant;
    stories: Story[];
}

interface StoryBarProps {
    shopStories: ShopWithStories[];
}

function isStoryViewed(storyId: string): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`story_viewed_${storyId}`) === "1";
}

function hasUnviewedStories(stories: Story[]): boolean {
    return stories.some((s) => !isStoryViewed(s.id));
}

export default function StoryBar({ shopStories }: StoryBarProps) {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [startShopIndex, setStartShopIndex] = useState(0);

    if (shopStories.length === 0) return null;

    const handleOpenStory = (shopIndex: number) => {
        setStartShopIndex(shopIndex);
        setViewerOpen(true);
    };

    return (
        <>
            <div className="border-b border-gray-100 bg-white px-3 py-3">
                <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                    {shopStories.map((item, index) => {
                        const unviewed = hasUnviewedStories(item.stories);
                        const shopImage =
                            item.shop.atmosphere_photos?.[0] ||
                            item.stories[0]?.image_url;

                        return (
                            <button
                                key={item.shop.id}
                                onClick={() => handleOpenStory(index)}
                                className="flex shrink-0 flex-col items-center gap-1"
                            >
                                <div
                                    className={`rounded-full p-[3px] ${
                                        unviewed
                                            ? "bg-gradient-to-tr from-orange-400 to-orange-600"
                                            : "bg-gray-300"
                                    }`}
                                >
                                    <div className="size-16 overflow-hidden rounded-full border-2 border-white bg-gray-100">
                                        {shopImage ? (
                                            <Image
                                                src={shopImage}
                                                alt={item.shop.name}
                                                width={64}
                                                height={64}
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-full items-center justify-center text-xs text-gray-400">
                                                {item.shop.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className="w-16 truncate text-center text-[10px] text-gray-600">
                                    {item.shop.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {viewerOpen && (
                <StoryViewer
                    shopStories={shopStories}
                    initialShopIndex={startShopIndex}
                    onClose={() => setViewerOpen(false)}
                />
            )}
        </>
    );
}
