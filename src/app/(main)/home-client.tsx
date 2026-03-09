"use client";
import { useState, useEffect } from "react";
import { Tabs } from "@/components/ui";
import { useFollowStore } from "@/store";
import { FeedCard } from "@/components/feed/feed-card";
import { EmptyState } from "@/components/feed/empty-state";
import { StoryBar } from "@/components/story/story-bar";
import { NearbyTab } from "@/components/discover/nearby-tab";
import { PopularTab } from "@/components/feed/popular-tab";
import type { InstagramPost, Restaurant, InstagramStory } from "@/types/database";

interface HomeClientProps {
    followingPosts: (InstagramPost & { restaurant: Restaurant })[];
    nearbyShops: Restaurant[];
    popularPosts: (InstagramPost & { restaurant: Restaurant })[];
    stories: (InstagramStory & { shop: Pick<Restaurant, "id" | "name" | "main_image"> })[];
    followingIds: string[];
    userId: string;
}

const tabs = [
    { key: "following", label: "フォロー中" },
    { key: "nearby", label: "近く" },
    { key: "popular", label: "人気" },
];

export function HomeClient({ followingPosts, nearbyShops, popularPosts, stories, followingIds, userId }: HomeClientProps) {
    const [activeTab, setActiveTab] = useState("following");
    const setFollowingIds = useFollowStore((s) => s.setFollowingIds);

    useEffect(() => {
        setFollowingIds(followingIds);
    }, [followingIds, setFollowingIds]);

    return (
        <div>
            {stories.length > 0 && <StoryBar stories={stories} />}
            <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

            {activeTab === "following" && (
                <div className="space-y-4 px-4 py-4">
                    {followingPosts.length === 0 ? (
                        <EmptyState
                            title="まだフォローしていません"
                            description="気になるお店をフォローすると、最新の投稿がここに表示されます"
                            actionLabel="お店を探す"
                            actionHref="/search"
                        />
                    ) : (
                        followingPosts.map((post) => (
                            <FeedCard key={post.id} post={post} restaurant={post.restaurant} />
                        ))
                    )}
                </div>
            )}

            {activeTab === "nearby" && (
                <NearbyTab shops={nearbyShops} />
            )}

            {activeTab === "popular" && (
                <PopularTab posts={popularPosts} />
            )}
        </div>
    );
}
