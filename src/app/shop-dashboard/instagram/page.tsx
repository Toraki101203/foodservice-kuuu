"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
    ArrowLeft,
    Instagram,
    Plus,
    Trash2,
    ExternalLink,
    AlertCircle,
    Loader2,
    Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InstagramPost } from "@/types/database";

const MAX_POSTS = 6;

export default function InstagramSettingsPage() {
    const supabase = createClient();
    const [shopId, setShopId] = useState<string | null>(null);
    const [instagramUsername, setInstagramUsername] = useState("");
    const [savedUsername, setSavedUsername] = useState("");
    const [posts, setPosts] = useState<InstagramPost[]>([]);
    const [newPostUrl, setNewPostUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [savingUsername, setSavingUsername] = useState(false);
    const [addingPost, setAddingPost] = useState(false);
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // 成功メッセージの自動クリア
    useEffect(() => {
        if (!successMessage) return;
        const timer = setTimeout(() => setSuccessMessage(null), 3000);
        return () => clearTimeout(timer);
    }, [successMessage]);

    // エラーメッセージの自動クリア
    useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => setError(null), 5000);
        return () => clearTimeout(timer);
    }, [error]);

    // 初期データ取得
    useEffect(() => {
        const loadData = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data: shop } = await supabase
                .from("shops")
                .select("id, instagram_username")
                .eq("owner_id", user.id)
                .limit(1)
                .single();

            if (!shop) {
                setLoading(false);
                return;
            }

            setShopId(shop.id);
            setInstagramUsername(shop.instagram_username || "");
            setSavedUsername(shop.instagram_username || "");

            const { data: postsData } = await supabase
                .from("instagram_posts")
                .select("*")
                .eq("restaurant_id", shop.id)
                .order("created_at", { ascending: false });

            setPosts(postsData || []);
            setLoading(false);
        };

        loadData();
    }, []);

    // ユーザー名保存
    const handleSaveUsername = useCallback(async () => {
        if (!shopId || savingUsername) return;
        setSavingUsername(true);
        setError(null);

        const trimmed = instagramUsername.trim().replace(/^@/, "");
        const previous = savedUsername;

        // 楽観的更新
        setSavedUsername(trimmed);

        const { error: updateError } = await supabase
            .from("shops")
            .update({ instagram_username: trimmed || null })
            .eq("id", shopId);

        if (updateError) {
            setSavedUsername(previous);
            setInstagramUsername(previous);
            setError("ユーザー名の保存に失敗しました。もう一度お試しください。");
        } else {
            setInstagramUsername(trimmed);
            setSuccessMessage("Instagramユーザー名を保存しました");
        }

        setSavingUsername(false);
    }, [shopId, savingUsername, instagramUsername, savedUsername, supabase]);

    // 投稿追加
    const handleAddPost = useCallback(async () => {
        if (!shopId || addingPost || !newPostUrl.trim()) return;
        if (posts.length >= MAX_POSTS) {
            setError(`投稿は最大${MAX_POSTS}件まで登録できます。`);
            return;
        }
        if (!newPostUrl.includes("instagram.com")) {
            setError("有効なInstagramのURLを入力してください。");
            return;
        }

        setAddingPost(true);
        setError(null);

        try {
            // oEmbed API でメタデータ取得
            const oembedRes = await fetch("/api/instagram/oembed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: newPostUrl.trim() }),
            });

            if (!oembedRes.ok) {
                const errData = await oembedRes.json();
                setError(errData.error || "投稿情報の取得に失敗しました。");
                setAddingPost(false);
                return;
            }

            const oembed = await oembedRes.json();

            // instagram_posts テーブルに保存
            const { data: newPost, error: insertError } = await supabase
                .from("instagram_posts")
                .insert({
                    restaurant_id: shopId,
                    permalink: newPostUrl.trim(),
                    image_url: oembed.thumbnail_url || "",
                    caption: oembed.title || oembed.author_name || null,
                    posted_at: null,
                    fetched_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (insertError) {
                setError("投稿の保存に失敗しました。もう一度お試しください。");
            } else if (newPost) {
                setPosts((prev) => [newPost, ...prev]);
                setNewPostUrl("");
                setSuccessMessage("Instagram投稿を追加しました");
            }
        } catch {
            setError("投稿の追加中にエラーが発生しました。");
        }

        setAddingPost(false);
    }, [shopId, addingPost, newPostUrl, posts.length, supabase]);

    // 投稿削除
    const handleDeletePost = useCallback(
        async (postId: string) => {
            if (!shopId || deletingPostId) return;
            setDeletingPostId(postId);

            // 楽観的更新
            const previous = posts;
            setPosts((prev) => prev.filter((p) => p.id !== postId));

            const { error: deleteError } = await supabase
                .from("instagram_posts")
                .delete()
                .eq("id", postId)
                .eq("restaurant_id", shopId);

            if (deleteError) {
                setPosts(previous);
                setError("投稿の削除に失敗しました。");
            } else {
                setSuccessMessage("投稿を削除しました");
            }

            setDeletingPostId(null);
        },
        [shopId, deletingPostId, posts, supabase]
    );

    if (loading) {
        return (
            <div className="flex min-h-[60dvh] items-center justify-center">
                <div className="text-sm text-[var(--color-text-muted)]">
                    読み込み中...
                </div>
            </div>
        );
    }

    if (!shopId) {
        return (
            <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4">
                <Instagram className="mb-4 size-12 text-[var(--color-text-muted)]" />
                <h2 className="mb-2 text-lg font-bold text-[var(--color-text-primary)]">
                    店舗が登録されていません
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                    管理者にお問い合わせください。
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-6">
            <Link
                href="/shop-dashboard"
                className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
                <ArrowLeft className="size-4" />
                ダッシュボードに戻る
            </Link>

            <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
                Instagram連携
            </h1>
            <p className="mb-6 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Instagramアカウントを連携し、投稿URLを登録すると店舗ページに表示されます。
            </p>

            {/* メッセージエリア */}
            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    <AlertCircle className="size-4 shrink-0" />
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-[var(--color-success)]">
                    {successMessage}
                </div>
            )}

            {/* ユーザー名設定 */}
            <section className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <h2 className="mb-3 text-base font-bold text-[var(--color-text-primary)]">
                    Instagramアカウント
                </h2>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <label
                            htmlFor="instagram-username"
                            className="mb-1 block text-xs text-[var(--color-text-muted)]"
                        >
                            ユーザー名
                        </label>
                        <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3">
                            <span className="text-sm text-[var(--color-text-muted)]">
                                @
                            </span>
                            <input
                                id="instagram-username"
                                type="text"
                                value={instagramUsername}
                                onChange={(e) =>
                                    setInstagramUsername(e.target.value)
                                }
                                placeholder="your_restaurant"
                                className="min-h-[44px] flex-1 bg-transparent px-1 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleSaveUsername}
                        disabled={
                            savingUsername ||
                            instagramUsername.trim().replace(/^@/, "") ===
                                savedUsername
                        }
                        className={cn(
                            "flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-5 text-sm font-bold transition-colors disabled:opacity-50",
                            "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                        )}
                    >
                        {savingUsername ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        保存
                    </button>
                </div>
                {savedUsername && (
                    <a
                        href={`https://instagram.com/${savedUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                    >
                        <ExternalLink className="size-3" />
                        @{savedUsername} のプロフィールを開く
                    </a>
                )}
            </section>

            {/* 投稿URL登録 */}
            <section className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                        投稿の登録
                    </h2>
                    <span
                        className={cn(
                            "text-xs font-medium tabular-nums",
                            posts.length >= MAX_POSTS
                                ? "text-red-500"
                                : "text-[var(--color-text-muted)]"
                        )}
                    >
                        {posts.length} / {MAX_POSTS}
                    </span>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    InstagramのURLを貼り付けて追加してください。店舗ページにサムネイルとして表示されます。
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                        type="url"
                        value={newPostUrl}
                        onChange={(e) => setNewPostUrl(e.target.value)}
                        placeholder="https://www.instagram.com/p/..."
                        disabled={posts.length >= MAX_POSTS}
                        className="min-h-[44px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] disabled:opacity-50"
                    />
                    <button
                        onClick={handleAddPost}
                        disabled={
                            addingPost ||
                            !newPostUrl.trim() ||
                            posts.length >= MAX_POSTS
                        }
                        className={cn(
                            "flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-5 text-sm font-bold transition-colors disabled:opacity-50",
                            "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                        )}
                    >
                        {addingPost ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        追加
                    </button>
                </div>
            </section>

            {/* 登録済み投稿一覧 */}
            <section>
                <h2 className="mb-3 text-base font-bold text-[var(--color-text-primary)]">
                    登録済み投稿
                </h2>
                {posts.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                            >
                                {/* サムネイル */}
                                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface-secondary)]">
                                    {post.image_url ? (
                                        <img
                                            src={post.image_url}
                                            alt={post.caption || "Instagram投稿"}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <ImageIcon className="size-8 text-[var(--color-text-muted)]" />
                                    )}
                                </div>

                                {/* 情報 */}
                                <div className="flex min-w-0 flex-1 flex-col">
                                    {post.caption && (
                                        <p className="mb-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                                            {post.caption}
                                        </p>
                                    )}
                                    <a
                                        href={post.permalink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-auto inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                                    >
                                        <ExternalLink className="size-3" />
                                        Instagramで見る
                                    </a>
                                </div>

                                {/* 削除ボタン */}
                                <button
                                    onClick={() => handleDeletePost(post.id)}
                                    disabled={deletingPostId === post.id}
                                    className="flex size-8 shrink-0 items-center justify-center self-start rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                                    aria-label="この投稿を削除"
                                >
                                    {deletingPostId === post.id ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="size-4" />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-8 text-center">
                        <Instagram className="mb-2 size-8 text-[var(--color-text-muted)]" />
                        <p className="text-sm font-medium text-[var(--color-text-muted)]">
                            まだ投稿が登録されていません
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            上のフォームからInstagram投稿URLを追加してください
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
