"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Navigation, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import type { InstagramPost } from "@/types/database";

type Props = {
  post: InstagramPost;
  shop: { name: string; main_image: string | null };
  shopId: string;
  isSaved: boolean;
  isLoggedIn: boolean;
};

export function PostDetailClient({ post, shop, shopId, isSaved: initialSaved, isLoggedIn }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);

  // 投稿閲覧トラッキング（初回マウント時に1回だけ記録）
  useEffect(() => {
    trackEvent(shopId, "post_view", { post_id: post.id });
  }, [shopId, post.id]);

  const handleSaveToggle = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    const prev = saved;
    setSaved(!saved);

    const res = await fetch("/api/post-favorites", {
      method: prev ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id }),
    });
    if (!res.ok) setSaved(prev);
  };

  return (
    <div className="min-h-dvh bg-white">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex size-9 items-center justify-center rounded-full bg-gray-100"
            aria-label="戻る"
          >
            <ArrowLeft className="size-4 text-gray-600" />
          </button>

          {/* 店舗情報（タップで店舗ページへ） */}
          <Link href={`/shop/${shopId}`} className="flex items-center gap-2">
            {shop.main_image ? (
              <img
                src={shop.main_image}
                alt=""
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <div className="size-8 rounded-full bg-orange-100" />
            )}
            <span className="text-sm font-bold text-gray-900">{shop.name}</span>
          </Link>
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSaveToggle}
          className="flex size-9 items-center justify-center"
          aria-label={saved ? "いいね済み" : "いいね"}
        >
          <Star
            className={cn(
              "size-5",
              saved ? "fill-yellow-400 text-yellow-400" : "text-gray-500"
            )}
          />
        </button>
      </header>

      {/* 投稿画像 */}
      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          className="w-full bg-gray-100"
        />
      )}

      {/* 投稿内容 */}
      <div className="px-4 py-4 pb-24">
        {/* キャプション */}
        {post.caption && (
          <p className="mb-4 text-sm leading-relaxed text-gray-700 text-pretty whitespace-pre-line">
            {post.caption}
          </p>
        )}

        {/* メタ情報 */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-xs text-gray-400">
            {post.posted_at ? formatDate(post.posted_at) : ""}
          </span>
          {post.permalink && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-orange-500"
            >
              <ExternalLink className="size-3" />
              Instagramで見る
            </a>
          )}
        </div>
      </div>

      {/* 「今すぐ行く」ボタン（固定フッター） */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-100 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Link
          href={`/shop/${shopId}`}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-bold text-white active:bg-orange-600"
        >
          <Navigation className="size-4" />
          このお店に行く
        </Link>
      </div>
    </div>
  );
}
