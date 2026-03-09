import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout";
import { ToastProvider } from "@/components/ui";

const notoSansJP = Noto_Sans_JP({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
    display: "swap",
    variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
    title: {
        default: "Kuuu — 好きなお店の\"今\"が見える",
        template: "%s | Kuuu",
    },
    description: "近くの飲食店のリアルタイム情報をInstagramから。空席確認・予約もできる。",
    openGraph: {
        type: "website",
        locale: "ja_JP",
        siteName: "Kuuu",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#f97316",
    viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ja" className={notoSansJP.variable}>
            <body className="font-sans text-gray-700 antialiased">
                <AuthProvider>
                    <AppShell>{children}</AppShell>
                    <ToastProvider />
                </AuthProvider>
            </body>
        </html>
    );
}
