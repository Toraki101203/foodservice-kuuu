"use client";
import { useState } from "react";
import Image from "next/image";
import { PostModal } from "./post-modal";
import type { InstagramPost } from "@/types/database";

interface InstagramGridProps {
    posts: InstagramPost[];
}

export function InstagramGrid({ posts }: InstagramGridProps) {
    const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);

    return (
        <>
            <div className="grid grid-cols-3 gap-0.5 p-4">
                {posts.map((post) => (
                    <button
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className="relative aspect-square overflow-hidden bg-gray-100"
                    >
                        <Image
                            src={post.image_url}
                            alt={post.caption ?? "投稿"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 33vw, 200px"
                        />
                    </button>
                ))}
            </div>

            {selectedPost && (
                <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
            )}
        </>
    );
}
