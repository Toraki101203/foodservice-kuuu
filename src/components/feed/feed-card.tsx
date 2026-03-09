"use client";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Avatar } from "@/components/ui";
import { formatRelativeTime } from "@/lib/utils";
import type { InstagramPost, Restaurant } from "@/types/database";

interface FeedCardProps {
    post: InstagramPost;
    restaurant: Pick<Restaurant, "id" | "name" | "genre" | "main_image">;
}

export function FeedCard({ post, restaurant }: FeedCardProps) {
    return (
        <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {/* ヘッダー */}
            <div className="flex items-center gap-3 px-4 py-3">
                <Link href={`/shop/${restaurant.id}`}>
                    <Avatar src={restaurant.main_image} alt={restaurant.name} size={36} />
                </Link>
                <div className="min-w-0 flex-1">
                    <Link href={`/shop/${restaurant.id}`} className="text-sm font-bold text-gray-900 hover:underline">
                        {restaurant.name}
                    </Link>
                    {restaurant.genre && (
                        <p className="text-xs text-gray-500">{restaurant.genre}</p>
                    )}
                </div>
                {post.posted_at && (
                    <span className="text-xs text-gray-400">{formatRelativeTime(post.posted_at)}</span>
                )}
            </div>

            {/* 投稿画像 */}
            <div className="relative aspect-square w-full bg-gray-100">
                <Image
                    src={post.image_url}
                    alt={post.caption ?? `${restaurant.name}の投稿`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 640px"
                />
            </div>

            {/* フッター */}
            <div className="px-4 py-3">
                <div className="mb-2 flex items-center gap-4">
                    <button aria-label="いいね" className="text-gray-600 hover:text-red-500">
                        <Heart className="size-6" />
                    </button>
                </div>
                {post.caption && (
                    <p className="text-sm leading-relaxed text-gray-700 line-clamp-3">{post.caption}</p>
                )}
                {post.permalink && (
                    <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-orange-500 hover:underline"
                    >
                        Instagramで見る
                    </a>
                )}
            </div>
        </article>
    );
}
