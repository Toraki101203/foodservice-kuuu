import Link from "next/link";
import { Utensils, MapPin, Calendar } from "lucide-react";

const features = [
    {
        icon: Utensils,
        title: "好きなお店の\"今\"が見える",
        description: "フォローした飲食店のInstagram投稿がリアルタイムで届く",
    },
    {
        icon: MapPin,
        title: "近くのお店をすぐ発見",
        description: "現在地周辺のお店を空席情報付きで見つけられる",
    },
    {
        icon: Calendar,
        title: "かんたん予約",
        description: "手数料0円。気に入ったお店にその場で予約",
    },
];

export default function LandingPage() {
    return (
        <div className="min-h-dvh bg-white">
            {/* ヒーロー */}
            <section className="flex flex-col items-center justify-center px-6 pb-16 pt-20 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                    <span className="text-orange-500">Kuuu</span>
                </h1>
                <p className="mt-4 text-balance text-lg text-gray-600">
                    好きなお店の&quot;今&quot;が見える<br />飲食店リアルタイムSNS
                </p>
                <div className="mt-8 flex gap-3">
                    <Link
                        href="/signup"
                        className="inline-flex h-12 items-center justify-center rounded-xl bg-orange-500 px-8 font-bold text-white hover:bg-orange-600"
                    >
                        無料で始める
                    </Link>
                    <Link
                        href="/login"
                        className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 px-8 font-bold text-gray-700 hover:bg-gray-50"
                    >
                        ログイン
                    </Link>
                </div>
            </section>

            {/* 特徴 */}
            <section className="bg-gray-50 px-6 py-16">
                <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
                    {features.map((feature) => (
                        <div key={feature.title} className="text-center">
                            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-orange-100">
                                <feature.icon className="size-7 text-orange-600" />
                            </div>
                            <h3 className="mt-4 text-base font-bold text-gray-900">{feature.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-gray-600">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* 店舗オーナー向け */}
            <section className="px-6 py-16 text-center">
                <h2 className="text-xl font-bold text-gray-900">店舗オーナーの方へ</h2>
                <p className="mt-3 text-sm text-gray-600">
                    Instagram連携で集客を自動化。<br />空席管理・予約受付・分析ダッシュボードを提供。
                </p>
                <Link
                    href="/signup"
                    className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-orange-500 px-6 text-sm font-bold text-orange-500 hover:bg-orange-50"
                >
                    店舗を登録する
                </Link>
            </section>

            {/* フッター */}
            <footer className="border-t border-gray-200 px-6 py-8 text-center text-xs text-gray-400">
                &copy; {new Date().getFullYear()} Kuuu. All rights reserved.
            </footer>
        </div>
    );
}
