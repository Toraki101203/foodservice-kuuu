"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { ShopGridCard } from "@/components/discover/shop-grid-card";
import { EmptyState } from "@/components/feed/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Follow, Shop, SeatStatus } from "@/types/database";

type FollowWithShop = Follow & { shop: Shop & { seat_status: SeatStatus[] } };

export function FavoritesClient({ follows: initial }: { follows: FollowWithShop[] }) {
  const [follows, setFollows] = useState(initial);
  const [deleteTarget, setDeleteTarget] = useState<FollowWithShop | null>(null);

  const handleUnfollow = async () => {
    if (!deleteTarget) return;
    const prev = follows;
    setFollows((f) => f.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);

    const res = await fetch("/api/follows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: deleteTarget.shop.id }),
    });
    if (!res.ok) setFollows(prev);
  };

  if (follows.length === 0) {
    return (
      <div className="px-4">
        <h1 className="py-4 text-xl font-bold text-gray-900">フォロー中</h1>
        <EmptyState
          icon={<Users className="size-12" />}
          title="まだフォローしているお店がありません"
          description="お店をフォローすると、ここに表示されます"
          actionLabel="お店を探す"
          actionHref="/search"
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-20">
      <h1 className="py-4 text-xl font-bold text-gray-900">フォロー中</h1>
      <div className="grid grid-cols-2 gap-3">
        {follows.map((f) => (
          <div
            key={f.id}
            onContextMenu={(e) => {
              e.preventDefault();
              setDeleteTarget(f);
            }}
          >
            <ShopGridCard shop={f.shop} />
          </div>
        ))}
      </div>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="フォロー解除"
        description={`${deleteTarget?.shop.name}のフォローを解除しますか？`}
      >
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
            キャンセル
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleUnfollow}>
            解除する
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
