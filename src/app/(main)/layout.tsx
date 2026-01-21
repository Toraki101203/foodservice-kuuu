import { Header, BottomNav } from "@/components/layout";

/**
 * メインアプリケーションのレイアウト
 * ヘッダー + コンテンツ + ボトムナビ
 */
export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-dvh bg-gray-50">
            <Header />
            <main className="main-content mx-auto max-w-lg">{children}</main>
            <BottomNav />
        </div>
    );
}
