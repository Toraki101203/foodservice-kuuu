import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * ダッシュボード（店舗オーナー向け）レイアウト
 */
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-dvh bg-gray-50">
            {/* ヘッダー */}
            <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
                <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
                    <Link href="/home" className="flex items-center gap-2 text-gray-600">
                        <ArrowLeft className="size-5" />
                        <span className="text-sm">アプリに戻る</span>
                    </Link>
                    <h1 className="font-semibold text-gray-900">店舗管理</h1>
                    <div className="w-20" /> {/* スペーサー */}
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        </div>
    );
}
