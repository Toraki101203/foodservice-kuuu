import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Phone, Heart, Share2, Calendar } from "lucide-react";
import { Button, Card, SeatStatusBadge } from "@/components/ui";

interface RestaurantPageProps {
    params: Promise<{ id: string }>;
}

/**
 * 店舗詳細ページ
 */
export default async function RestaurantPage({ params }: RestaurantPageProps) {
    const { id } = await params;

    // TODO: Supabaseから店舗情報を取得
    const restaurant = {
        id,
        name: "麺屋 Kuuu",
        description:
            "熊本で人気のラーメン店。濃厚な豚骨スープと自家製麺が自慢です。地元の新鮮な食材を使用し、毎日丁寧にスープを仕込んでいます。",
        address: "熊本県熊本市中央区下通1-2-3",
        phone: "096-123-4567",
        categories: ["ラーメン", "つけ麺"],
        business_hours: {
            monday: { open: "11:00", close: "22:00" },
            tuesday: { open: "11:00", close: "22:00" },
            wednesday: { open: "11:00", close: "22:00" },
            thursday: { open: "11:00", close: "22:00" },
            friday: { open: "11:00", close: "23:00" },
            saturday: { open: "11:00", close: "23:00" },
            sunday: { open: "11:00", close: "21:00" },
        },
        seat_status: {
            status: "available" as const,
            available_seats: 5,
            wait_time_minutes: 0,
            updated_at: new Date().toISOString(),
        },
    };

    return (
        <div className="min-h-dvh bg-gray-50 pb-24">
            {/* ヘッダー画像 */}
            <div className="relative h-56 bg-gradient-to-b from-gray-300 to-gray-400">
                {/* 戻るボタン */}
                <Link
                    href="/discover"
                    className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm"
                >
                    <ArrowLeft className="size-5 text-gray-700" />
                </Link>

                {/* アクションボタン */}
                <div className="absolute right-4 top-4 flex gap-2">
                    <button
                        className="flex size-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm"
                        aria-label="お気に入りに追加"
                    >
                        <Heart className="size-5 text-gray-700" />
                    </button>
                    <button
                        className="flex size-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm"
                        aria-label="シェア"
                    >
                        <Share2 className="size-5 text-gray-700" />
                    </button>
                </div>

                {/* プレースホルダー画像 */}
                <div className="flex size-full items-center justify-center text-6xl">
                    🍜
                </div>
            </div>

            {/* コンテンツ */}
            <div className="relative -mt-6 rounded-t-3xl bg-gray-50 px-4 pt-6">
                {/* 店舗名・基本情報 */}
                <div className="mb-4">
                    <div className="mb-2 flex flex-wrap gap-2">
                        {restaurant.categories.map((cat) => (
                            <span
                                key={cat}
                                className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600"
                            >
                                {cat}
                            </span>
                        ))}
                    </div>
                    <h1 className="mb-2 text-2xl font-bold text-gray-900">
                        {restaurant.name}
                    </h1>
                    <p className="text-gray-600 leading-relaxed">
                        {restaurant.description}
                    </p>
                </div>

                {/* 席状況カード */}
                <Card className="mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="mb-1 text-sm text-gray-500">現在の席状況</p>
                            <SeatStatusBadge
                                status={restaurant.seat_status.status}
                                availableSeats={restaurant.seat_status.available_seats}
                                waitTimeMinutes={restaurant.seat_status.wait_time_minutes}
                                showDetails
                            />
                        </div>
                        <div className="text-right text-xs text-gray-400">
                            <p>最終更新</p>
                            <p>たった今</p>
                        </div>
                    </div>
                </Card>

                {/* 予約ボタン */}
                <Button className="mb-6 w-full" size="lg">
                    <Calendar className="mr-2 size-5" />
                    今すぐ予約する
                </Button>

                {/* 店舗情報 */}
                <Card className="mb-4">
                    <h2 className="mb-4 font-semibold text-gray-900">店舗情報</h2>

                    <div className="space-y-4">
                        {/* 住所 */}
                        <div className="flex items-start gap-3">
                            <MapPin className="mt-0.5 size-5 flex-shrink-0 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-600">{restaurant.address}</p>
                                <button className="mt-1 text-sm text-orange-500 hover:underline">
                                    地図で見る
                                </button>
                            </div>
                        </div>

                        {/* 電話番号 */}
                        <div className="flex items-center gap-3">
                            <Phone className="size-5 flex-shrink-0 text-gray-400" />
                            <a
                                href={`tel:${restaurant.phone}`}
                                className="text-sm text-orange-500 hover:underline"
                            >
                                {restaurant.phone}
                            </a>
                        </div>

                        {/* 営業時間 */}
                        <div className="flex items-start gap-3">
                            <Clock className="mt-0.5 size-5 flex-shrink-0 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">営業時間</p>
                                <div className="mt-1 space-y-1 text-sm text-gray-600">
                                    <p>月〜木: 11:00 - 22:00</p>
                                    <p>金・土: 11:00 - 23:00</p>
                                    <p>日: 11:00 - 21:00</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 最新の投稿 */}
                <Card>
                    <h2 className="mb-4 font-semibold text-gray-900">最新の投稿</h2>
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="flex gap-3">
                                <div className="size-20 flex-shrink-0 rounded-lg bg-gray-200" />
                                <div className="flex-1">
                                    <p className="mb-1 text-sm text-gray-600 line-clamp-2">
                                        本日のおすすめは特製チャーシュー麺です！
                                        とろとろのチャーシューをぜひお試しください。
                                    </p>
                                    <p className="text-xs text-gray-400">2時間前</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="mt-4 w-full text-center text-sm text-orange-500 hover:underline">
                        すべての投稿を見る
                    </button>
                </Card>
            </div>

            {/* 固定フッター */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 py-3 pb-safe">
                <div className="mx-auto flex max-w-lg items-center gap-3">
                    <Button variant="outline" className="flex-1">
                        <Phone className="mr-2 size-4" />
                        電話する
                    </Button>
                    <Button className="flex-1">
                        <Calendar className="mr-2 size-4" />
                        予約する
                    </Button>
                </div>
            </div>
        </div>
    );
}
