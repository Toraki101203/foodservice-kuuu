"use client";

import { useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { InstagramPost } from "@/types/database";

export function InstagramGrid({ posts }: { posts: InstagramPost[] }) {
  const [selected, setSelected] = useState<InstagramPost | null>(null);

  if (posts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        まだ投稿がありません
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post) => (
          <button
            key={post.id}
            onClick={() => setSelected(post)}
            className="relative aspect-square bg-gray-100"
          >
            {post.image_url && (
              <img
                src={post.image_url}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            )}
          </button>
        ))}
      </div>

      {/* モーダル */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-white">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/50 p-1"
              aria-label="閉じる"
            >
              <X className="size-5 text-white" />
            </button>
            {selected.image_url && (
              <img src={selected.image_url} alt="" className="w-full" />
            )}
            <div className="p-4">
              {selected.caption && (
                <p className="mb-2 text-sm leading-relaxed text-gray-700 text-pretty">
                  {selected.caption}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {selected.posted_at ? formatDate(selected.posted_at) : ""}
                </span>
                {selected.permalink && (
                  <a
                    href={selected.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-orange-500"
                  >
                    <ExternalLink className="size-3" />
                    Instagramで見る
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
