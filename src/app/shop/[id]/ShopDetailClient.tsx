"use client";

import { useState, useEffect } from "react";
import { CalendarDays } from "lucide-react";
import ReservationForm from "@/components/reservation/ReservationForm";
import { InstagramGrid } from "@/components/shop/InstagramGrid";
import { SeatBadge } from "@/components/discover/SeatBadge";
import { trackEvent } from "@/lib/analytics";
import type { InstagramPost, SeatStatus, PlanType } from "@/types/database";

interface ShopDetailClientProps {
    shopId: string;
    shopName: string;
    ownerId: string;
    planType: PlanType;
    instagramPosts: InstagramPost[];
    seatStatus: SeatStatus | null;
}

/**
 * 店舗詳細ページのクライアントコンポーネント
 * 席状況バッジ・Instagram投稿・予約ボタン（固定CTA）・分析トラッキングを管理
 */
export default function ShopDetailClient({
    shopId,
    shopName,
    ownerId,
    planType,
    instagramPosts,
    seatStatus,
}: ShopDetailClientProps) {
    const [isReservationOpen, setIsReservationOpen] = useState(false);

    // ページ閲覧イベントを記録
    useEffect(() => {
        trackEvent(shopId, "view");
    }, [shopId]);

    const showReservation = planType === "standard" || planType === "premium";

    return (
        <>
            {/* 席状況バッジ */}
            {seatStatus && (
                <div className="mt-4 px-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">席状況:</span>
                        <SeatBadge status={seatStatus.status} />
                        {seatStatus.wait_time_minutes != null && seatStatus.wait_time_minutes > 0 && (
                            <span className="text-xs text-gray-500">
                                (待ち時間 約{seatStatus.wait_time_minutes}分)
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Instagram投稿グリッド */}
            <InstagramGrid posts={instagramPosts} />

            {/* 固定CTA: 予約するボタン（standard/premium プランのみ） */}
            {showReservation && (
                <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm pb-safe">
                    <div className="mx-auto max-w-lg">
                        <button
                            onClick={() => setIsReservationOpen(true)}
                            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white transition-colors hover:bg-orange-600 active:scale-[0.98]"
                        >
                            <CalendarDays className="size-5" />
                            予約する
                        </button>
                    </div>
                </div>
            )}

            {/* 予約モーダル */}
            {showReservation && (
                <ReservationForm
                    shopId={shopId}
                    shopName={shopName}
                    ownerId={ownerId}
                    isOpen={isReservationOpen}
                    onClose={() => setIsReservationOpen(false)}
                />
            )}
        </>
    );
}
