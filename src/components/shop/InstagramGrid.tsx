"use client";

import Image from "next/image";
import { Instagram } from "lucide-react";
import type { InstagramPost } from "@/types/database";

interface InstagramGridProps {
  posts: InstagramPost[];
}

/**
 * Instagram投稿をグリッド表示するコンポーネント
 * 最大6件を3列グリッドで表示し、タップで元投稿へ遷移する
 */
export function InstagramGrid({ posts }: InstagramGridProps) {
  if (!posts || posts.length === 0) return null;

  // 最大6件に制限
  const displayPosts = posts.slice(0, 6);

  return (
    <div className="mt-5 px-4">
      {/* ヘッダー */}
      <div className="mb-3 flex items-center gap-2">
        <Instagram className="size-4 text-pink-500" />
        <h2 className="text-sm font-bold text-gray-800">Instagram投稿</h2>
      </div>

      {/* グリッド */}
      <div className="grid grid-cols-3 gap-1.5">
        {displayPosts.map((post) => (
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square overflow-hidden rounded-lg"
          >
            <Image
              src={post.image_url}
              alt={post.caption ?? "Instagram投稿"}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="33vw"
            />
            {/* キャプション hover オーバーレイ */}
            {post.caption && (
              <div className="absolute inset-0 flex items-end bg-black/50 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="line-clamp-3 text-xs leading-relaxed text-white">
                  {post.caption}
                </p>
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
