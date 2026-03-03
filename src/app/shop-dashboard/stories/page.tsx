"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImagePlus, ArrowLeft, Check, Store, CreditCard, X, Clock, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Database } from "@/types/database";

type Shop = Database["public"]["Tables"]["shops"]["Row"];
type Story = Database["public"]["Tables"]["stories"]["Row"];

function getTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return "期限切れ";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `残り${hours}時間${minutes}分`;
    return `残り${minutes}分`;
}

export default function ShopStoriesPage() {
    const supabase = createClient();
    const [shop, setShop] = useState<Shop | null>(null);
    const [stories, setStories] = useState<Story[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [caption, setCaption] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

    useEffect(() => {
        const load = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data: shopData } = await supabase
                .from("shops")
                .select("*")
                .eq("owner_id", user.id)
                .limit(1)
                .single();

            if (shopData) {
                setShop(shopData);

                const { data: subscription } = await supabase
                    .from("subscriptions")
                    .select("status")
                    .eq("shop_id", shopData.id)
                    .single();

                setHasActiveSubscription(subscription?.status === "active");

                const { data: storiesData } = await supabase
                    .from("stories")
                    .select("*")
                    .eq("shop_id", shopData.id)
                    .gt("expires_at", new Date().toISOString())
                    .order("created_at", { ascending: false });

                setStories(storiesData || []);
            }
        };
        load();
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shop || !imageFile) return;
        setLoading(true);

        const fileName = `stories/${shop.id}/${Date.now()}_${imageFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("post-images")
            .upload(fileName, imageFile);

        if (uploadError) {
            setLoading(false);
            return;
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from("post-images").getPublicUrl(uploadData.path);

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const { data: storyData } = await supabase
            .from("stories")
            .insert({
                shop_id: shop.id,
                image_url: publicUrl,
                caption: caption || null,
                expires_at: expiresAt,
            })
            .select()
            .single();

        if (storyData) {
            setStories([storyData, ...stories]);
            setSuccess(true);
            setImageFile(null);
            setImagePreview(null);
            setCaption("");
            setTimeout(() => setSuccess(false), 3000);
        }

        setLoading(false);
    };

    const handleDelete = async (storyId: string) => {
        const { error } = await supabase.from("stories").delete().eq("id", storyId);
        if (!error) {
            setStories(stories.filter((s) => s.id !== storyId));
        }
    };

    if (shop && !hasActiveSubscription) {
        return (
            <div className="mx-auto flex min-h-[60dvh] max-w-3xl flex-col items-center justify-center px-4 text-center">
                <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-[var(--color-primary-light)]">
                    <Store className="size-10 text-[var(--color-primary)]" />
                </div>
                <h1 className="mb-4 text-2xl font-bold text-[var(--color-text-primary)]">
                    プランの契約が必要です
                </h1>
                <p className="mb-8 text-sm leading-relaxed text-[var(--color-text-secondary)] md:text-base">
                    ストーリー機能を利用するには、有料プランの契約が必要です。
                </p>
                <Link
                    href="/shop-dashboard/billing"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-8 font-bold text-white shadow-sm transition-all hover:bg-[var(--color-primary-hover)] hover:shadow"
                >
                    <CreditCard className="size-5" />
                    料金プランを確認する
                </Link>
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
                ストーリー投稿
            </h1>
            <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
                24時間限定で表示される写真を投稿しましょう。本日の限定メニューや空席情報をリアルタイムに発信できます。
            </p>

            {success && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-[var(--color-success)]">
                    <Check className="size-4" />
                    ストーリーを投稿しました！
                </div>
            )}

            {/* 投稿フォーム */}
            <form
                onSubmit={handleSubmit}
                className="mb-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            >
                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
                        写真
                    </label>
                    {imagePreview ? (
                        <div className="relative aspect-[9/16] max-h-[400px] w-full overflow-hidden rounded-xl">
                            <Image
                                src={imagePreview}
                                alt="プレビュー"
                                fill
                                className="object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setImageFile(null);
                                    setImagePreview(null);
                                }}
                                className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                                aria-label="画像を削除"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                    ) : (
                        <label className="flex aspect-[9/16] max-h-[400px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)] transition-colors hover:border-[var(--color-primary)]">
                            <ImagePlus className="mb-2 size-8 text-[var(--color-text-muted)]" />
                            <span className="text-sm text-[var(--color-text-muted)]">
                                タップして写真を選択
                            </span>
                            <span className="mt-1 text-xs text-[var(--color-text-muted)]">
                                縦長の写真がおすすめ
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </label>
                    )}
                </div>

                <div className="mb-4">
                    <label
                        htmlFor="caption"
                        className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]"
                    >
                        一言メッセージ
                    </label>
                    <input
                        id="caption"
                        type="text"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="例: 本日限定！特製海鮮丼 🐟"
                        maxLength={100}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    />
                    <p className="mt-1 text-right text-xs text-[var(--color-text-muted)]">
                        {caption.length}/100
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading || !imageFile}
                    className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                    {loading ? "投稿中..." : "ストーリーを投稿"}
                </button>
            </form>

            {/* アクティブなストーリー一覧 */}
            <h2 className="mb-3 text-lg font-bold text-[var(--color-text-primary)]">
                公開中のストーリー
            </h2>
            {stories.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {stories.map((story) => (
                        <div
                            key={story.id}
                            className="group relative overflow-hidden rounded-xl border border-[var(--color-border)]"
                        >
                            <div className="relative aspect-[9/16] w-full overflow-hidden">
                                <Image
                                    src={story.image_url}
                                    alt={story.caption || "ストーリー"}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 50vw, 33vw"
                                />
                                {/* オーバーレイ */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                {/* キャプション */}
                                {story.caption && (
                                    <p className="absolute bottom-8 left-2 right-2 text-xs font-medium text-white">
                                        {story.caption}
                                    </p>
                                )}
                                {/* 残り時間 */}
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white/80">
                                    <Clock className="size-3" />
                                    {getTimeRemaining(story.expires_at)}
                                </div>
                                {/* 削除ボタン */}
                                <button
                                    onClick={() => handleDelete(story.id)}
                                    className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                                    aria-label="ストーリーを削除"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="rounded-xl bg-[var(--color-surface-secondary)] p-6 text-center text-sm text-[var(--color-text-muted)]">
                    公開中のストーリーはありません
                </p>
            )}
        </div>
    );
}
