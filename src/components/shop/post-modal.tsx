"use client";
import Image from "next/image";
import { X, ExternalLink } from "lucide-react";
import type { InstagramPost } from "@/types/database";

interface PostModalProps {
    post: InstagramPost;
    onClose: () => void;
}

export function PostModal({ post, onClose }: PostModalProps) {
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70" onClick={onClose}>
            <div
                className="relative mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/50 text-white"
                    aria-label="閉じる"
                >
                    <X className="size-4" />
                </button>

                <div className="relative aspect-square w-full bg-gray-100">
                    <Image src={post.image_url} alt={post.caption ?? "投稿"} fill className="object-cover" />
                </div>

                <div className="p-4">
                    {post.caption && (
                        <p className="text-sm leading-relaxed text-gray-700">{post.caption}</p>
                    )}
                    {post.permalink && (
                        <a
                            href={post.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1 text-sm text-orange-500 hover:underline"
                        >
                            <ExternalLink className="size-4" />
                            Instagramで見る
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
