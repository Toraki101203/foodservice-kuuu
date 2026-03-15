"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { ShopGridCard } from "@/components/discover/shop-grid-card";
import { EmptyState } from "@/components/feed/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Favorite, Shop, SeatStatus } from "@/types/database";

type FavoriteWithShop = Favorite & { shop: Shop & { seat_status: SeatStatus[] } };

export function FavoritesClient({ favorites: initial }: { favorites: FavoriteWithShop[] }) {
  const [favorites, setFavorites] = useState(initial);
  const [deleteTarget, setDeleteTarget] = useState<FavoriteWithShop | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const prev = favorites;
    setFavorites((f) => f.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) setFavorites(prev);
  };

  if (favorites.length === 0) {
    return (
      <div className="px-4">
        <h1 className="py-4 text-xl font-bold text-gray-900">お気に入り</h1>
        <EmptyState
          icon={<Heart className="size-12" />}
          title="まだお気に入りのお店がありません"
          description="お店を探してお気に入りに追加すると、ここに表示されます"
          actionLabel="お店を探す"
          actionHref="/search"
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-20">
      <h1 className="py-4 text-xl font-bold text-gray-900">お気に入り</h1>
      <div className="grid grid-cols-2 gap-3">
        {favorites.map((fav) => (
          <div
            key={fav.id}
            onContextMenu={(e) => {
              e.preventDefault();
              setDeleteTarget(fav);
            }}
          >
            <ShopGridCard shop={fav.shop} />
          </div>
        ))}
      </div>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="お気に入りから削除"
        description={`${deleteTarget?.shop.name}をお気に入りから削除しますか？`}
      >
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
            キャンセル
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>
            削除する
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
