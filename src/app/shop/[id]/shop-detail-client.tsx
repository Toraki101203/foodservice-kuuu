"use client";
import { useState, useCallback } from "react";
import Image from "next/image";
import { ArrowLeft, MapPin, Phone, Clock, UserPlus, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, SeatBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { InstagramGrid } from "@/components/shop/instagram-grid";
import { ReservationForm } from "@/components/reservation/reservation-form";
import { useFollowStore } from "@/store";
import type { Restaurant, InstagramPost, SeatStatus } from "@/types/database";

interface ShopDetailClientProps {
    shop: Restaurant;
    posts: InstagramPost[];
    seatStatus: SeatStatus | null;
    isFollowing: boolean;
    userId: string | null;
}

export function ShopDetailClient({ shop, posts, seatStatus, isFollowing: initialFollowing, userId }: ShopDetailClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [following, setFollowing] = useState(initialFollowing);
    const [showReservation, setShowReservation] = useState(false);
    const { addFollow, removeFollow } = useFollowStore();

    const toggleFollow = useCallback(async () => {
        if (!userId) {
            router.push("/login");
            return;
        }

        const supabase = createClient();
        const prev = following;
        setFollowing(!prev);

        if (prev) {
            removeFollow(shop.id);
            const { error } = await supabase.from("follows").delete().eq("user_id", userId).eq("shop_id", shop.id);
            if (error) {
                setFollowing(prev);
                addFollow(shop.id);
                toast("フォロー解除に失敗しました", "error");
            }
        } else {
            addFollow(shop.id);
            const { error } = await supabase.from("follows").insert({ user_id: userId, shop_id: shop.id });
            if (error) {
                setFollowing(prev);
                removeFollow(shop.id);
                toast("フォローに失敗しました", "error");
            }
        }
    }, [userId, following, shop.id, router, toast, addFollow, removeFollow]);

    return (
        <div className="pb-20">
            {/* ヘッダー画像 */}
            <div className="relative aspect-[16/9] w-full bg-gray-200">
                {shop.main_image ? (
                    <Image src={shop.main_image} alt={shop.name} fill className="object-cover" priority />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">No Image</div>
                )}
                <button
                    onClick={() => router.back()}
                    className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/80 shadow"
                    aria-label="戻る"
                >
                    <ArrowLeft className="size-5 text-gray-700" />
                </button>
            </div>

            {/* 店舗情報 */}
            <div className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{shop.name}</h1>
                        {shop.genre && <p className="mt-1 text-sm text-gray-500">{shop.genre}</p>}
                    </div>
                    {seatStatus && <SeatBadge status={seatStatus.status} />}
                </div>

                {/* フォロー + 予約ボタン */}
                <div className="mt-4 flex gap-3">
                    <Button
                        variant={following ? "secondary" : "primary"}
                        size="sm"
                        onClick={toggleFollow}
                        className="flex-1"
                    >
                        {following ? (
                            <><UserMinus className="size-4" /> フォロー中</>
                        ) : (
                            <><UserPlus className="size-4" /> フォロー</>
                        )}
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setShowReservation(true)}
                        className="flex-1"
                    >
                        予約する
                    </Button>
                </div>

                {/* 基本情報 */}
                <div className="mt-6 space-y-3">
                    <div className="flex items-start gap-3 text-sm text-gray-600">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-gray-400" />
                        <span>{shop.address}</span>
                    </div>
                    {shop.phone && (
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <Phone className="size-4 shrink-0 text-gray-400" />
                            <a href={`tel:${shop.phone}`} className="hover:underline">{shop.phone}</a>
                        </div>
                    )}
                    {shop.business_hours && (
                        <div className="flex items-start gap-3 text-sm text-gray-600">
                            <Clock className="mt-0.5 size-4 shrink-0 text-gray-400" />
                            <span>営業時間</span>
                        </div>
                    )}
                </div>

                {shop.description && (
                    <p className="mt-4 text-sm leading-relaxed text-gray-700">{shop.description}</p>
                )}
            </div>

            {/* Instagram グリッド */}
            {posts.length > 0 && (
                <div className="mt-2">
                    <h2 className="px-4 text-sm font-bold text-gray-900">Instagram</h2>
                    <InstagramGrid posts={posts} />
                </div>
            )}

            {/* 予約フォーム */}
            {showReservation && userId && (
                <ReservationForm
                    shopId={shop.id}
                    userId={userId}
                    onClose={() => setShowReservation(false)}
                />
            )}
        </div>
    );
}
