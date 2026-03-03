/**
 * メインアプリケーションのレイアウト
 * Header/BottomNav は AppShell (root layout) で管理するため、ここではchildrenをそのまま返す
 */
export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
