"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImagePlus, Ticket, ArrowLeft, Check, Store, CreditCard, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Database } from "@/types/database";

type Shop = Database["public"]["Tables"]["shops"]["Row"];
type Post = Database["public"]["Tables"]["posts"]["Row"] & {
    coupon?: Database["public"]["Tables"]["coupons"]["Row"] | null;
};

export default function ShopPostsPage() {
    const supabase = createClient();
    const [shop, setShop] = useState<Shop | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [caption, setCaption] = useState("");
    const [couponTitle, setCouponTitle] = useState("");
    const [couponExpiry, setCouponExpiry] = useState("");
    const [showCoupon, setShowCoupon] = useState(false);
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

                const { data: postsData } = await supabase
                    .from("posts")
                    .select("*")
                    .eq("shop_id", shopData.id)
                    .order("created_at", { ascending: false })
                    .limit(20);

                setPosts(postsData || []);
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

        // 画像をアップロード
        const fileName = `${shop.id}/${Date.now()}_${imageFile.name}`;
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

        // クーポンを作成（オプション）
        let couponId: string | null = null;
        if (showCoupon && couponTitle && couponExpiry) {
            const { data: couponData } = await supabase
                .from("coupons")
                .insert({
                    shop_id: shop.id,
                    title: couponTitle,
                    valid_until: couponExpiry,
                })
                .select()
                .single();

            if (couponData) {
                couponId = couponData.id;
            }
        }

        // 投稿を作成
        const { data: postData } = await supabase
            .from("posts")
            .insert({
                shop_id: shop.id,
                image_url: publicUrl,
                caption: caption || null,
                coupon_id: couponId,
            })
            .select()
            .single();

        if (postData) {
            setPosts([postData, ...posts]);
            setSuccess(true);
            setImageFile(null);
            setImagePreview(null);
            setCaption("");
            setCouponTitle("");
            setCouponExpiry("");
            setShowCoupon(false);
            setTimeout(() => setSuccess(false), 3000);
        }

        setLoading(false);
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
                    店舗ダッシュボードの機能を引き続き利用するには、有料プランの契約が必要です。<br />
                    料金プランページよりご希望のプランを選択して、利用を開始してください。
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

            <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
                今日の1枚を投稿
            </h1>

            {/* 成功メッセージ */}
            {success && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-[var(--color-success)]">
                    <Check className="size-4" />
                    投稿が完了しました！
                </div>
            )}

            {/* 投稿フォーム */}
            <form
                onSubmit={handleSubmit}
                className="mb-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            >
                {/* 画像アップロード */}
                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
                        写真
                    </label>
                    {imagePreview ? (
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
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
                        <label className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)] transition-colors hover:border-[var(--color-primary)]">
                            <ImagePlus className="mb-2 size-8 text-[var(--color-text-muted)]" />
                            <span className="text-sm text-[var(--color-text-muted)]">
                                クリックして写真を選択
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

                {/* キャプション */}
                <div className="mb-4">
                    <label
                        htmlFor="caption"
                        className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]"
                    >
                        一言コメント
                    </label>
                    <textarea
                        id="caption"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="今日のおすすめは？空席情報は？"
                        rows={2}
                        className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    />
                </div>

                {/* クーポン添付 */}
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => setShowCoupon(!showCoupon)}
                        className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
                    >
                        <Ticket className="size-4" />
                        {showCoupon ? "クーポンを外す" : "クーポンを添付する"}
                    </button>

                    {showCoupon && (
                        <div className="mt-3 rounded-lg border border-dashed border-[var(--color-primary)] bg-[var(--color-primary-light)] p-4">
                            <input
                                type="text"
                                value={couponTitle}
                                onChange={(e) => setCouponTitle(e.target.value)}
                                placeholder="例: NOWを見たで生ビール1杯無料！"
                                className="mb-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                            />
                            <input
                                type="date"
                                value={couponExpiry}
                                onChange={(e) => setCouponExpiry(e.target.value)}
                                min={new Date().toISOString().split("T")[0]}
                                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                            />
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading || !imageFile}
                    className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                    {loading ? "投稿中..." : "投稿する"}
                </button>
            </form>

            {/* 過去の投稿一覧 */}
            <h2 className="mb-3 text-lg font-bold text-[var(--color-text-primary)]">
                過去の投稿
            </h2>
            {posts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {posts.map((post) => (
                        <div
                            key={post.id}
                            className="overflow-hidden rounded-xl border border-[var(--color-border)]"
                        >
                            <div className="relative aspect-square w-full overflow-hidden">
                                <Image
                                    src={post.image_url}
                                    alt={post.caption || "投稿"}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 50vw, 33vw"
                                />
                            </div>
                            <div className="p-2">
                                <p className="text-xs text-[var(--color-text-muted)]">
                                    {post.post_date}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="rounded-xl bg-[var(--color-surface-secondary)] p-6 text-center text-sm text-[var(--color-text-muted)]">
                    まだ投稿がありません
                </p>
            )}
        </div>
    );
}
