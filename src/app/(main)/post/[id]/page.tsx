import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { formatDate } from "@/lib/format";
import PostDetailClient from "./PostDetailClient";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 投稿と関連する店舗情報を取得
    const { data: rawPost, error } = await supabase
        .from("posts")
        .select(`
            *,
            shop:shops(*)
        `)
        .eq("id", id)
        .single();

    if (error || !rawPost) {
        notFound();
    }

    const post = rawPost as any;
    const shop = post.shop;

    return (
        <div className="pb-4">
            {/* 投稿画像 */}
            {post.image_url && (
                <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                    <Image
                        src={post.image_url}
                        alt={post.caption || "投稿画像"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 42rem"
                    />
                </div>
            )}

            <div className="px-4 pt-4">
                {/* 店舗情報 */}
                {shop && (
                    <Link
                        href={`/shop/${shop.id}`}
                        className="mb-4 block rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                    >
                        <h3 className="text-sm font-bold text-gray-800 hover:text-orange-500">
                            {shop.name}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{shop.address}</span>
                        </p>
                    </Link>
                )}

                {/* 投稿日 */}
                <p className="mb-3 text-xs text-gray-400">
                    {formatDate(post.created_at)}
                </p>

                {/* キャプション */}
                {post.caption && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {post.caption}
                    </p>
                )}
            </div>

            {/* いいね・コメント */}
            <PostDetailClient postId={post.id} initialLikeCount={post.like_count || 0} initialCommentCount={post.comment_count || 0} />
        </div>
    );
}
