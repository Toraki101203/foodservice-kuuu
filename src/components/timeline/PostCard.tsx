"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { Database } from "@/types/database";

type Post = Database["public"]["Tables"]["posts"]["Row"] & {
    shop: Database["public"]["Tables"]["shops"]["Row"];
    coupon: Database["public"]["Tables"]["coupons"]["Row"] | null;
};
import { Heart, Bookmark } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface PostCardProps {
    post: Post;
    isFavorited?: boolean;
    onToggleFavorite?: () => void;
    distanceKm?: number | null;
}

export default function PostCard({ post, isFavorited = false, onToggleFavorite, distanceKm }: PostCardProps) {
    const shop = post.shop;
    const supabase = createClient();

    // 投稿のいいね状態
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.like_count || 0);
    const [userId, setUserId] = useState<string | null>(null);

    // ユーザー情報を取得し、この投稿をいいねしているか確認
    useEffect(() => {
        const checkLikeStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const { data } = await supabase
                .from("post_likes")
                .select("id")
                .eq("post_id", post.id)
                .eq("user_id", user.id)
                .single();

            if (data) setIsLiked(true);
        };
        checkLikeStatus();
    }, [supabase, post.id]);

    const handleToggleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!userId) {
            window.location.href = "/login";
            return;
        }

        const newIsLiked = !isLiked;
        const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

        // 楽観的UI更新
        setIsLiked(newIsLiked);
        setLikeCount(newLikeCount);

        if (newIsLiked) {
            await supabase.from("post_likes").insert({ post_id: post.id, user_id: userId });
            await supabase.rpc('increment_like_count', { row_id: post.id }); // Note: RPC or backend trigger needed. Assuming we do manual update for now if RPC fails via table update.
            // Direct table update fallback if no RPC
            await supabase.from("posts").update({ like_count: newLikeCount }).eq("id", post.id);
        } else {
            await supabase.from("post_likes").delete().match({ post_id: post.id, user_id: userId });
            await supabase.from("posts").update({ like_count: Math.max(0, newLikeCount) }).eq("id", post.id);
        }
    };

    return (
        <article className="group">
            {/* 投稿画像(リンク) */}
            <Link href={`/post/${post.id}`} className="relative block aspect-[4/3] w-full overflow-hidden bg-gray-100">
                {post.image_url ? (
                    <Image
                        src={post.image_url}
                        alt={post.caption || "投稿画像"}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center text-gray-400">
                        No Image
                    </div>
                )}

                {/* クーポンバッジ */}
                {post.coupon && (
                    <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                        <Ticket className="size-3" />
                        {post.coupon.title}
                    </div>
                )}

                {/* お気に入り(保存)ボタン */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onToggleFavorite) onToggleFavorite();
                    }}
                    className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 z-10"
                    aria-label="お店を保存"
                >
                    <Bookmark
                        className={cn("size-5", isFavorited && "fill-current text-white")}
                    />
                </div>

                {/* 日付バッジ / 距離バッジ */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {distanceKm !== undefined && distanceKm !== null && (
                        <div className="rounded-full bg-orange-500/90 px-2.5 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-sm">
                            {distanceKm < 1 ? "1km圏内" : `${distanceKm}km`}
                        </div>
                    )}
                    <div className="rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        {formatDate(post.created_at)}
                    </div>
                </div>
            </Link>

            {/* コンテンツ */}
            <div className="px-4 pt-3 pb-4">
                {/* 店舗情報 */}
                {shop && (
                    <Link href={`/shop/${shop.id}`} className="group/link block">
                        <h3 className="text-balance text-base font-bold text-gray-800 transition-colors group-hover/link:text-orange-500">
                            {shop.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                            {shop.genre && (
                                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-medium">
                                    {shop.genre}
                                </span>
                            )}
                            {shop.price_range && (
                                <span className="font-bold text-orange-500">
                                    {shop.price_range}
                                </span>
                            )}
                        </div>
                        {shop.address && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                                <MapPin className="size-3 shrink-0" />
                                <span className="truncate">{shop.address}</span>
                            </p>
                        )}
                    </Link>
                )}

                {/* キャプション */}
                {post.caption && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-700">
                        {post.caption}
                    </p>
                )}

                {/* いいねボタン */}
                <div className="mt-3 flex items-center gap-5">
                    <button
                        onClick={handleToggleLike}
                        className="flex items-center gap-1.5 text-gray-500 transition-colors hover:text-pink-500"
                    >
                        <Heart className={cn("size-5 transition-transform active:scale-75", isLiked && "fill-pink-500 text-pink-500")} />
                        <span className="text-sm font-bold">{likeCount}</span>
                    </button>
                </div>
            </div>
        </article>
    );
}
