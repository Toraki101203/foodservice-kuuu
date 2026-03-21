import Link from "next/link";
import type { InstagramPost } from "@/types/database";

export function InstagramGrid({
  posts,
  shopId,
}: {
  posts: InstagramPost[];
  shopId: string;
}) {
  if (posts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        まだ投稿がありません
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 px-4">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/shop/${shopId}/post/${post.id}`}
          className="relative aspect-square overflow-hidden bg-gray-100"
        >
          {post.image_url && (
            <img
              src={post.image_url}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          )}
        </Link>
      ))}
    </div>
  );
}
