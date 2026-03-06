import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
    MapPin,
    Clock,
    Phone,
    Users,
    DoorOpen,
    CalendarDays,
    Ticket,
} from "lucide-react";
import ShopDetailClient from "./ShopDetailClient";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ShopDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // 店舗情報を取得
    const { data: shop } = await supabase
        .from("shops")
        .select("*")
        .eq("id", id)
        .eq("status", "active")
        .single();

    if (!shop) {
        notFound();
    }

    // アクティブなクーポンを取得
    const today = new Date().toISOString().split("T")[0];
    const { data: coupons } = await supabase
        .from("coupons")
        .select("*")
        .eq("shop_id", id)
        .eq("is_active", true)
        .gte("valid_until", today)
        .order("created_at", { ascending: false });

    return (
        <div className="pb-24">
            {/* ヒーロー画像 */}
            {shop.atmosphere_photos && shop.atmosphere_photos.length > 0 ? (
                <div className="-mt-16 relative aspect-[16/9] w-full overflow-hidden">
                    <Image
                        src={shop.atmosphere_photos[0]}
                        alt={shop.name}
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority
                    />
                    {/* 営業中バッジ */}
                    {shop.is_open && (
                        <div className="absolute left-4 top-16 flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                            <span className="size-1.5 animate-pulse rounded-full bg-white" />
                            営業中
                        </div>
                    )}
                </div>
            ) : (
                /* 画像がない場合に営業中バッジだけ表示 */
                shop.is_open && (
                    <div className="px-4 pt-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white">
                            <span className="size-1.5 animate-pulse rounded-full bg-white" />
                            営業中
                        </span>
                    </div>
                )
            )}

            {/* 店舗名・ジャンル・説明 */}
            <div className={`px-4 ${shop.atmosphere_photos && shop.atmosphere_photos.length > 0 ? "pt-4" : "pt-1"}`}>
                <h1 className="text-2xl font-bold text-gray-800">
                    {shop.name}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {shop.genre && (
                        <span className="text-sm font-bold text-gray-600">
                            {shop.genre}
                        </span>
                    )}
                    {shop.price_range && (
                        <span className="text-sm font-bold text-orange-500">
                            {shop.price_range}
                        </span>
                    )}
                </div>

                {/* 説明 */}
                {shop.description && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {shop.description}
                    </p>
                )}
            </div>

            {/* 基本情報カード */}
            <div className="mt-5 px-4">
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                    <h2 className="mb-3 text-sm font-bold text-gray-800">店舗情報</h2>
                    <div className="flex flex-col gap-3 text-sm text-gray-600">
                        {shop.address && (
                            <div className="flex items-start gap-2.5">
                                <MapPin className="mt-0.5 size-4 shrink-0 text-gray-400" />
                                <span>{shop.address}</span>
                            </div>
                        )}
                        {shop.business_hours && (
                            <div className="flex items-start gap-2.5">
                                <Clock className="mt-0.5 size-4 shrink-0 text-gray-400" />
                                <span>{shop.business_hours}</span>
                            </div>
                        )}
                        {shop.phone && (
                            <div className="flex items-start gap-2.5">
                                <Phone className="mt-0.5 size-4 shrink-0 text-gray-400" />
                                <a
                                    href={`tel:${shop.phone}`}
                                    className="text-orange-500 hover:underline"
                                >
                                    {shop.phone}
                                </a>
                            </div>
                        )}
                        {shop.closed_days && (
                            <div className="flex items-start gap-2.5">
                                <CalendarDays className="mt-0.5 size-4 shrink-0 text-gray-400" />
                                <span>定休日: {shop.closed_days}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-4">
                            {shop.seat_count && (
                                <div className="flex items-center gap-1.5">
                                    <Users className="size-4 text-gray-400" />
                                    <span>{shop.seat_count}席</span>
                                </div>
                            )}
                            {shop.has_private_room && (
                                <div className="flex items-center gap-1.5">
                                    <DoorOpen className="size-4 text-gray-400" />
                                    <span>個室あり</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 雰囲気写真（2枚目以降） */}
            {shop.atmosphere_photos && shop.atmosphere_photos.length > 1 && (
                <div className="mt-5 px-4">
                    <h2 className="mb-3 text-sm font-bold text-gray-800">雰囲気</h2>
                    <div className="grid grid-cols-3 gap-1.5">
                        {shop.atmosphere_photos.slice(1).map((photo: string, index: number) => (
                            <div
                                key={index}
                                className="relative aspect-square overflow-hidden rounded-lg"
                            >
                                <Image
                                    src={photo}
                                    alt={`${shop.name} ${index + 2}`}
                                    fill
                                    className="object-cover"
                                    sizes="33vw"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* クーポン */}
            {coupons && coupons.length > 0 && (
                <div className="mt-5 px-4">
                    <h2 className="mb-3 text-sm font-bold text-gray-800">
                        利用可能なクーポン
                    </h2>
                    <div className="flex flex-col gap-2.5">
                        {coupons.map((coupon) => (
                            <div
                                key={coupon.id}
                                className="flex items-start gap-3 rounded-xl border border-dashed border-orange-300 bg-orange-50 p-3.5"
                            >
                                <Ticket className="mt-0.5 size-5 shrink-0 text-orange-500" />
                                <div>
                                    <p className="font-bold text-orange-600">
                                        {coupon.title}
                                    </p>
                                    {coupon.description && (
                                        <p className="mt-0.5 text-xs text-gray-500">
                                            {coupon.description}
                                        </p>
                                    )}
                                    <p className="mt-0.5 text-xs text-gray-400">
                                        〜 {coupon.valid_until} まで
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 予約ボタン（固定CTA） + モーダル管理はクライアントコンポーネント */}
            <ShopDetailClient shopId={shop.id} shopName={shop.name} ownerId={shop.owner_id} />
        </div>
    );
}
