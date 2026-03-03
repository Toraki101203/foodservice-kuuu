"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostDetailClientProps {
    postId: string;
    initialLikeCount: number;
    initialCommentCount: number;
}

export default function PostDetailClient({ postId, initialLikeCount }: PostDetailClientProps) {
    const supabase = createClient();
    const [userId, setUserId] = useState<string | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(initialLikeCount);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const { data: likeData } = await supabase
                    .from("post_likes")
                    .select("id")
                    .eq("post_id", postId)
                    .eq("user_id", user.id)
                    .single();
                if (likeData) setIsLiked(true);
            }
        };
        init();
    }, [supabase, postId]);

    const handleToggleLike = async () => {
        if (!userId) {
            window.location.href = "/login";
            return;
        }

        const newIsLiked = !isLiked;
        const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

        setIsLiked(newIsLiked);
        setLikeCount(newLikeCount);

        if (newIsLiked) {
            await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
            await supabase.from("posts").update({ like_count: newLikeCount }).eq("id", postId);
        } else {
            await supabase.from("post_likes").delete().match({ post_id: postId, user_id: userId });
            await supabase.from("posts").update({ like_count: Math.max(0, newLikeCount) }).eq("id", postId);
        }
    };

    return (
        <div className="flex items-center gap-4 border-t border-gray-200 px-4 py-3">
            <button
                onClick={handleToggleLike}
                className="flex items-center gap-1.5 text-gray-500 transition-colors hover:text-pink-500"
            >
                <Heart className={cn("size-6 transition-transform active:scale-75", isLiked && "fill-pink-500 text-pink-500")} />
                <span className="text-sm font-bold text-gray-800">{likeCount > 0 ? likeCount : ""}</span>
            </button>
        </div>
    );
}
