import Link from "next/link";
import { Button } from "@/components/ui";

/**
 * ホームページ（フィード）
 * フォロー中の店舗・ユーザーの投稿一覧
 */
export default function HomePage() {
    // TODO: Supabaseから投稿を取得

    return (
        <div className="px-4 py-4">
            {/* ウェルカムメッセージ（ログイン前） */}
            <div className="mb-6 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
                <h1 className="mb-2 text-2xl font-bold">Kuuu へようこそ！</h1>
                <p className="mb-4 text-orange-100 leading-relaxed">
                    飲食店のリアルタイムな情報をチェック。
                    <br />
                    空席状況がすぐにわかります。
                </p>
                <div className="flex gap-3">
                    <Link href="/login">
                        <Button variant="secondary" size="sm">
                            ログイン
                        </Button>
                    </Link>
                    <Link href="/signup">
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-white text-white hover:bg-white/20"
                        >
                            新規登録
                        </Button>
                    </Link>
                </div>
            </div>

            {/* おすすめ店舗セクション */}
            <section className="mb-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                    📍 近くのおすすめ店舗
                </h2>
                <div className="space-y-3">
                    {/* プレースホルダーカード */}
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
                        >
                            <div className="size-16 flex-shrink-0 rounded-lg bg-gray-200" />
                            <div className="flex-1">
                                <div className="mb-1 h-5 w-32 rounded bg-gray-200" />
                                <div className="mb-2 h-4 w-24 rounded bg-gray-100" />
                                <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600">
                                        🟢 空席あり
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <Link
                    href="/discover"
                    className="mt-4 block text-center text-sm text-orange-500 hover:underline"
                >
                    もっと見る →
                </Link>
            </section>

            {/* 最新の投稿セクション */}
            <section>
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                    📸 最新の投稿
                </h2>
                <div className="space-y-4">
                    {/* プレースホルダー投稿 */}
                    {[1, 2].map((i) => (
                        <div key={i} className="rounded-xl bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center gap-3">
                                <div className="size-10 rounded-full bg-gray-200" />
                                <div>
                                    <div className="mb-1 h-4 w-24 rounded bg-gray-200" />
                                    <div className="h-3 w-16 rounded bg-gray-100" />
                                </div>
                            </div>
                            <div className="mb-3 aspect-video w-full rounded-lg bg-gray-200" />
                            <div className="h-4 w-full rounded bg-gray-100" />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
