"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
    RefreshCw,
    Link2,
    CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InstagramPost } from "@/types/database";

export default function InstagramSettingsPage() {
    return (
        <Suspense>
            <InstagramSettings />
        </Suspense>
    );
}

const MAX_POSTS = 6;

function InstagramSettings() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const [shopId, setShopId] = useState<string | null>(null);
    const [instagramUsername, setInstagramUsername] = useState("");
    const [savedUsername, setSavedUsername] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [syncedAt, setSyncedAt] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [posts, setPosts] = useState<InstagramPost[]>([]);
    const [newPostUrl, setNewPostUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [savingUsername, setSavingUsername] = useState(false);
    const [addingPost, setAddingPost] = useState(false);
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // URLパラメータからのメッセージ表示
    useEffect(() => {
        if (searchParams.get("connected") === "true") {
            setSuccessMessage("Instagramアカウントを連携しました！");
        }
        if (searchParams.get("synced") === "true") {
            setSuccessMessage("Instagramアカウントを連携し、投稿を同期しました！");
        }
        const errParam = searchParams.get("error");
        if (errParam === "denied") setError("Instagram連携が拒否されました。");
        if (errParam === "token") setError("Instagram認証に失敗しました。もう一度お試しください。");
        if (errParam === "config") setError("Instagram連携の設定が完了していません。管理者にお問い合わせください。");
    }, [searchParams]);

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
                .select("id, instagram_username, instagram_access_token, instagram_synced_at")
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
            setIsConnected(!!shop.instagram_access_token);
            setSyncedAt(shop.instagram_synced_at || null);

            const { data: postsData } = await supabase
                .from("instagram_posts")
                .select("*")
                .eq("restaurant_id", shop.id)
                .order("posted_at", { ascending: false, nullsFirst: false });

            setPosts(postsData || []);
            setLoading(false);
        };

        loadData();
    }, []);

    // 手動同期
    const handleSync = useCallback(async () => {
        if (syncing) return;
        setSyncing(true);
        setError(null);

        try {
            const res = await fetch("/api/instagram/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "同期に失敗しました。");
            } else {
                setSuccessMessage(`${data.added || 0}件の新しい投稿を同期しました`);
                setSyncedAt(new Date().toISOString());

                // 投稿一覧をリフレッシュ
                if (shopId) {
                    const { data: postsData } = await supabase
                        .from("instagram_posts")
                        .select("*")
                        .eq("restaurant_id", shopId)
                        .order("posted_at", { ascending: false, nullsFirst: false });
                    setPosts(postsData || []);
                }
            }
        } catch {
            setError("同期中にエラーが発生しました。");
        }

        setSyncing(false);
    }, [syncing, shopId, supabase]);

    // ユーザー名保存
    const handleSaveUsername = useCallback(async () => {
        if (!shopId || savingUsername) return;
        setSavingUsername(true);
        setError(null);

        const trimmed = instagramUsername.trim().replace(/^@/, "");
        const previous = savedUsername;

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

    // 投稿追加（手動）
    const handleAddPost = useCallback(async () => {
        if (!shopId || addingPost || !newPostUrl.trim()) return;
        if (!newPostUrl.includes("instagram.com")) {
            setError("有効なInstagramのURLを入力してください。");
            return;
        }

        setAddingPost(true);
        setError(null);

        try {
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
    }, [shopId, addingPost, newPostUrl, supabase]);

    // 投稿削除
    const handleDeletePost = useCallback(
        async (postId: string) => {
            if (!shopId || deletingPostId) return;
            setDeletingPostId(postId);

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
                <div className="text-sm text-gray-400">読み込み中...</div>
            </div>
        );
    }

    if (!shopId) {
        return (
            <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4">
                <Instagram className="mb-4 size-12 text-gray-300" />
                <h2 className="mb-2 text-lg font-bold text-gray-700">
                    店舗が登録されていません
                </h2>
                <p className="text-sm text-gray-500">管理者にお問い合わせください。</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-6">
            <Link
                href="/shop-dashboard"
                className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
                <ArrowLeft className="size-4" />
                ダッシュボードに戻る
            </Link>

            <h1 className="mb-2 text-2xl font-bold text-gray-800">
                Instagram連携
            </h1>
            <p className="mb-6 text-sm leading-relaxed text-gray-500">
                Instagramアカウントを連携すると、投稿が自動でフィードに表示されます。
            </p>

            {/* メッセージエリア */}
            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    <AlertCircle className="size-4 shrink-0" />
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-600">
                    <CheckCircle2 className="size-4 shrink-0" />
                    {successMessage}
                </div>
            )}

            {/* 自動連携セクション */}
            <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Link2 className="size-5 text-purple-500" />
                    <h2 className="text-base font-bold text-gray-800">
                        自動連携
                    </h2>
                    {isConnected && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                            連携中
                        </span>
                    )}
                </div>

                {isConnected ? (
                    <div>
                        <p className="mb-3 text-sm text-gray-500 leading-relaxed">
                            Instagramアカウントが連携されています。投稿は自動的に同期されます。
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-purple-500 px-5 text-sm font-bold text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
                            >
                                {syncing ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="size-4" />
                                )}
                                今すぐ同期
                            </button>
                            {syncedAt && (
                                <span className="text-xs text-gray-400">
                                    最終同期: {new Date(syncedAt).toLocaleString("ja-JP")}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="mb-3 text-sm text-gray-500 leading-relaxed text-pretty">
                            Instagramアカウントを連携すると、投稿が自動的にフィードに表示されます。
                            手動でURLを登録する必要がなくなります。
                        </p>
                        <a
                            href="/api/instagram/auth"
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 text-sm font-bold text-white transition-opacity hover:opacity-90"
                        >
                            <Instagram className="size-5" />
                            Instagramを連携する
                        </a>
                    </div>
                )}
            </section>

            {/* 手動登録セクション */}
            <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Instagram className="size-5 text-orange-500" />
                    <h2 className="text-base font-bold text-gray-800">
                        手動登録
                    </h2>
                </div>

                {/* ユーザー名設定 */}
                <div className="mb-4">
                    <label
                        htmlFor="instagram-username"
                        className="mb-1 block text-xs text-gray-400"
                    >
                        Instagramユーザー名
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex flex-1 items-center rounded-lg border border-gray-200 bg-gray-50 px-3">
                            <span className="text-sm text-gray-400">@</span>
                            <input
                                id="instagram-username"
                                type="text"
                                value={instagramUsername}
                                onChange={(e) => setInstagramUsername(e.target.value)}
                                placeholder="your_restaurant"
                                className="min-h-[44px] flex-1 bg-transparent px-1 text-sm text-gray-700 outline-none placeholder:text-gray-300"
                            />
                        </div>
                        <button
                            onClick={handleSaveUsername}
                            disabled={
                                savingUsername ||
                                instagramUsername.trim().replace(/^@/, "") === savedUsername
                            }
                            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                        >
                            {savingUsername && <Loader2 className="size-4 animate-spin" />}
                            保存
                        </button>
                    </div>
                    {savedUsername && (
                        <a
                            href={`https://instagram.com/${savedUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-orange-500 hover:underline"
                        >
                            <ExternalLink className="size-3" />
                            @{savedUsername} のプロフィールを開く
                        </a>
                    )}
                </div>

                {/* 投稿URL登録 */}
                <div className="border-t border-gray-100 pt-4">
                    <p className="mb-3 text-xs leading-relaxed text-gray-500">
                        自動連携を使わない場合は、InstagramのURLを貼り付けて個別に追加できます。
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                            type="url"
                            value={newPostUrl}
                            onChange={(e) => setNewPostUrl(e.target.value)}
                            placeholder="https://www.instagram.com/p/..."
                            className="min-h-[44px] flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none placeholder:text-gray-300 disabled:opacity-50"
                        />
                        <button
                            onClick={handleAddPost}
                            disabled={addingPost || !newPostUrl.trim()}
                            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                        >
                            {addingPost ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Plus className="size-4" />
                            )}
                            追加
                        </button>
                    </div>
                </div>
            </section>

            {/* 登録済み投稿一覧 */}
            <section>
                <h2 className="mb-3 text-base font-bold text-gray-800">
                    投稿一覧（{posts.length}件）
                </h2>
                {posts.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3"
                            >
                                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
                                    {post.image_url ? (
                                        <img
                                            src={post.image_url}
                                            alt={post.caption || "Instagram投稿"}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <ImageIcon className="size-8 text-gray-300" />
                                    )}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col">
                                    {post.caption && (
                                        <p className="mb-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                                            {post.caption}
                                        </p>
                                    )}
                                    <a
                                        href={post.permalink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-auto inline-flex items-center gap-1 text-xs text-orange-500 hover:underline"
                                    >
                                        <ExternalLink className="size-3" />
                                        Instagramで見る
                                    </a>
                                </div>
                                <button
                                    onClick={() => handleDeletePost(post.id)}
                                    disabled={deletingPostId === post.id}
                                    className="flex size-8 shrink-0 items-center justify-center self-start rounded-lg text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
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
                    <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                        <Instagram className="mb-2 size-8 text-gray-300" />
                        <p className="text-sm font-bold text-gray-400">
                            まだ投稿がありません
                        </p>
                        <p className="mt-1 text-xs text-gray-400 text-pretty">
                            {isConnected
                                ? "「今すぐ同期」で投稿を取り込めます"
                                : "自動連携するか、URLを手動で追加してください"}
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
