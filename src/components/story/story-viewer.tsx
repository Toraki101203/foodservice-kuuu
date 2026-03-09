"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { InstagramStory, Restaurant } from "@/types/database";

type StoryWithShop = InstagramStory & { shop: Pick<Restaurant, "id" | "name" | "main_image"> };

interface StoryGroup {
    shopId: string;
    shop: Pick<Restaurant, "id" | "name" | "main_image">;
    stories: StoryWithShop[];
}

interface StoryViewerProps {
    groups: StoryGroup[];
    initialIndex: number;
    onClose: () => void;
}

export function StoryViewer({ groups, initialIndex, onClose }: StoryViewerProps) {
    const [groupIndex, setGroupIndex] = useState(initialIndex);
    const [storyIndex, setStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    const currentGroup = groups[groupIndex];
    const currentStory = currentGroup?.stories[storyIndex];

    const goNext = useCallback(() => {
        if (storyIndex < currentGroup.stories.length - 1) {
            setStoryIndex((prev) => prev + 1);
            setProgress(0);
        } else if (groupIndex < groups.length - 1) {
            setGroupIndex((prev) => prev + 1);
            setStoryIndex(0);
            setProgress(0);
        } else {
            onClose();
        }
    }, [storyIndex, groupIndex, currentGroup, groups.length, onClose]);

    const goPrev = useCallback(() => {
        if (storyIndex > 0) {
            setStoryIndex((prev) => prev - 1);
            setProgress(0);
        } else if (groupIndex > 0) {
            setGroupIndex((prev) => prev - 1);
            setStoryIndex(0);
            setProgress(0);
        }
    }, [storyIndex, groupIndex]);

    // 5秒で自動進行
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    goNext();
                    return 0;
                }
                return prev + 2;
            });
        }, 100);
        return () => clearInterval(interval);
    }, [goNext]);

    if (!currentStory) return null;

    return (
        <div className="fixed inset-0 z-40 bg-black">
            {/* プログレスバー */}
            <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
                {currentGroup.stories.map((_, i) => (
                    <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                        <div
                            className="h-full bg-white transition-all duration-100"
                            style={{
                                width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* ヘッダー */}
            <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Avatar src={currentGroup.shop.main_image} alt={currentGroup.shop.name} size={32} />
                    <span className="text-sm font-bold text-white">{currentGroup.shop.name}</span>
                </div>
                <button onClick={onClose} aria-label="閉じる" className="text-white">
                    <X className="size-6" />
                </button>
            </div>

            {/* コンテンツ */}
            <div className="relative h-full w-full">
                {currentStory.media_type === "IMAGE" ? (
                    <Image
                        src={currentStory.media_url}
                        alt={`${currentGroup.shop.name}のストーリー`}
                        fill
                        className="object-contain"
                        priority
                    />
                ) : (
                    <video
                        src={currentStory.media_url}
                        autoPlay
                        muted
                        playsInline
                        className="h-full w-full object-contain"
                    />
                )}
            </div>

            {/* タップ領域 */}
            <button
                onClick={goPrev}
                className="absolute left-0 top-0 h-full w-1/3"
                aria-label="前へ"
            />
            <button
                onClick={goNext}
                className="absolute right-0 top-0 h-full w-2/3"
                aria-label="次へ"
            />
        </div>
    );
}
