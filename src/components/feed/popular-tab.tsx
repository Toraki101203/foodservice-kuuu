"use client";
import { FeedCard } from "./feed-card";
import { EmptyState } from "./empty-state";
import type { InstagramPost, Restaurant } from "@/types/database";

interface PopularTabProps {
    posts: (InstagramPost & { restaurant: Restaurant })[];
}

export function PopularTab({ posts }: PopularTabProps) {
    if (posts.length === 0) {
        return (
            <EmptyState
                title="まだ投稿がありません"
                description="人気の投稿がここに表示されます"
            />
        );
    }

    return (
        <div className="space-y-4 px-4 py-4">
            <h2 className="text-sm font-bold text-gray-900">トレンド</h2>
            {posts.map((post) => (
                <FeedCard key={post.id} post={post} restaurant={post.restaurant} />
            ))}
        </div>
    );
}
