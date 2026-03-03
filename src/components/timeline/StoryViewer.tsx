"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { ShopWithStories } from "./StoryBar";

interface StoryViewerProps {
    shopStories: ShopWithStories[];
    initialShopIndex: number;
    onClose: () => void;
}

const STORY_DURATION = 5000;

function markStoryViewed(storyId: string) {
    if (typeof window !== "undefined") {
        localStorage.setItem(`story_viewed_${storyId}`, "1");
    }
}

function getTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) return "たった今";
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    return "1日前";
}

export default function StoryViewer({
    shopStories,
    initialShopIndex,
    onClose,
}: StoryViewerProps) {
    const [shopIndex, setShopIndex] = useState(initialShopIndex);
    const [storyIndex, setStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(Date.now());
    const elapsedRef = useRef<number>(0);

    const currentShop = shopStories[shopIndex];
    const currentStory = currentShop?.stories[storyIndex];

    const goToNextStory = useCallback(() => {
        const shop = shopStories[shopIndex];
        if (storyIndex < shop.stories.length - 1) {
            setStoryIndex(storyIndex + 1);
            setProgress(0);
            elapsedRef.current = 0;
        } else if (shopIndex < shopStories.length - 1) {
            setShopIndex(shopIndex + 1);
            setStoryIndex(0);
            setProgress(0);
            elapsedRef.current = 0;
        } else {
            onClose();
        }
    }, [shopIndex, storyIndex, shopStories, onClose]);

    const goToPrevStory = useCallback(() => {
        if (storyIndex > 0) {
            setStoryIndex(storyIndex - 1);
            setProgress(0);
            elapsedRef.current = 0;
        } else if (shopIndex > 0) {
            const prevShop = shopStories[shopIndex - 1];
            setShopIndex(shopIndex - 1);
            setStoryIndex(prevShop.stories.length - 1);
            setProgress(0);
            elapsedRef.current = 0;
        }
    }, [shopIndex, storyIndex, shopStories]);

    // Mark story as viewed
    useEffect(() => {
        if (currentStory) {
            markStoryViewed(currentStory.id);
        }
    }, [currentStory]);

    // Auto-progress timer
    useEffect(() => {
        if (paused) return;

        startTimeRef.current = Date.now();

        timerRef.current = setInterval(() => {
            const elapsed = elapsedRef.current + (Date.now() - startTimeRef.current);
            const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
            setProgress(pct);
            if (pct >= 100) {
                goToNextStory();
            }
        }, 50);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            elapsedRef.current += Date.now() - startTimeRef.current;
        };
    }, [shopIndex, storyIndex, paused, goToNextStory]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight") goToNextStory();
            if (e.key === "ArrowLeft") goToPrevStory();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, goToNextStory, goToPrevStory]);

    if (!currentShop || !currentStory) return null;

    const stories = currentShop.stories;
    const shopImage =
        currentShop.shop.atmosphere_photos?.[0] || currentStory.image_url;

    const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const threshold = rect.width / 3;

        if (x < threshold) {
            goToPrevStory();
        } else {
            goToNextStory();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black">
            {/* Progress bars */}
            <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 px-2 pt-2">
                {stories.map((_, i) => (
                    <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                        <div
                            className="h-full rounded-full bg-white transition-none"
                            style={{
                                width:
                                    i < storyIndex
                                        ? "100%"
                                        : i === storyIndex
                                          ? `${progress}%`
                                          : "0%",
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="absolute left-0 right-0 top-4 z-20 flex items-center justify-between px-4 pt-2">
                <div className="flex items-center gap-3">
                    <div className="size-9 overflow-hidden rounded-full border-2 border-white/60 bg-gray-800">
                        {shopImage && (
                            <Image
                                src={shopImage}
                                alt={currentShop.shop.name}
                                width={36}
                                height={36}
                                className="size-full object-cover"
                            />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">
                            {currentShop.shop.name}
                        </p>
                        <p className="text-[11px] text-white/70">
                            {getTimeAgo(currentStory.created_at)}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="flex size-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
                    aria-label="閉じる"
                >
                    <X className="size-5" />
                </button>
            </div>

            {/* Story image */}
            <div
                className="relative flex size-full items-center justify-center"
                onClick={handleTap}
                onMouseDown={() => setPaused(true)}
                onMouseUp={() => setPaused(false)}
                onTouchStart={() => setPaused(true)}
                onTouchEnd={() => setPaused(false)}
            >
                <Image
                    src={currentStory.image_url}
                    alt={currentStory.caption || "ストーリー"}
                    fill
                    className="object-contain"
                    sizes="100vw"
                    priority
                />
            </div>

            {/* Caption overlay */}
            {currentStory.caption && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-6 pb-8 pt-16">
                    <p className="text-center text-base font-medium text-white drop-shadow-lg">
                        {currentStory.caption}
                    </p>
                </div>
            )}
        </div>
    );
}
