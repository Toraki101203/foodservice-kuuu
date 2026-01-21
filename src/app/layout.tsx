import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kuuu - 飲食店専用SNS",
    template: "%s | Kuuu",
  },
  description:
    "飲食店とユーザーをリアルタイムでつなぐSNS。空席状況をリアルタイムで確認、予約手数料0円。",
  keywords: ["飲食店", "SNS", "グルメ", "予約", "空席", "リアルタイム"],
  authors: [{ name: "Kuuu" }],
  creator: "Kuuu",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "Kuuu",
    title: "Kuuu - 飲食店専用SNS",
    description:
      "飲食店とユーザーをリアルタイムでつなぐSNS。空席状況をリアルタイムで確認、予約手数料0円。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kuuu - 飲食店専用SNS",
    description:
      "飲食店とユーザーをリアルタイムでつなぐSNS。空席状況をリアルタイムで確認、予約手数料0円。",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kuuu",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} antialiased`}>{children}</body>
    </html>
  );
}
