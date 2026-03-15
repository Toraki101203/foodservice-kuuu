"use client";

import { useState, useMemo } from "react";
import { UtensilsCrossed } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { FeedCard, EmptyState, StoryBar, StoryViewer } from "@/components/feed";
import type { InstagramPost, Shop, SeatStatus, InstagramStory } from "@/types/database";

type PostWithShop = InstagramPost & { shop: Shop & { seat_status: SeatStatus[] } };

type StoryGroup = {
  shop: Shop & { seat_status: SeatStatus[] };
  stories: InstagramStory[];
  hasUnread: boolean;
};

type HomeClientProps = {
  followingPosts: PostWithShop[];
  nearbyPosts: PostWithShop[];
  popularPosts: PostWithShop[];
  stories: StoryGroup[];
  favoriteShopIds: string[];
};

const TABS = ["フォロー中", "近く", "人気"];

export function HomeClient({
  followingPosts,
  nearbyPosts,
  popularPosts,
  stories,
  favoriteShopIds,
}: HomeClientProps) {
  const [activeTab, setActiveTab] = useState("フォロー中");
  const [viewingStory, setViewingStory] = useState<number | null>(null);

  // 配列から Set を生成（O(1) ルックアップのため）
  const favSet = useMemo(() => new Set(favoriteShopIds), [favoriteShopIds]);

  const currentPosts =
    activeTab === "フォロー中"
      ? followingPosts
      : activeTab === "近く"
        ? nearbyPosts
        : popularPosts;

  return (
    <>
      <StoryBar
        items={stories}
        onStoryClick={(index) => setViewingStory(index)}
      />
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {currentPosts.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="size-12" />}
          title={
            activeTab === "フォロー中"
              ? "まだお店をフォローしていません"
              : "投稿が見つかりません"
          }
          description={
            activeTab === "フォロー中"
              ? "近くのお店を見つけてフォローすると最新の投稿がここに表示されます"
              : "近くのお店の投稿がここに表示されます"
          }
          actionLabel="近くのお店を探す"
          onAction={() => setActiveTab("近く")}
        />
      ) : (
        <div>
          {currentPosts.map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              isFavorited={favSet.has(post.shop?.id)}
            />
          ))}
        </div>
      )}

      {viewingStory !== null && (
        <StoryViewer
          shops={stories}
          initialShopIndex={viewingStory}
          onClose={() => setViewingStory(null)}
        />
      )}
    </>
  );
}
