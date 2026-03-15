import Link from "next/link";
import { Camera, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Camera,
    title: "Instagram連携で最新情報",
    description:
      "お気に入りのお店のInstagram投稿がリアルタイムで反映。メニューやイベント情報を見逃しません。",
  },
  {
    icon: Users,
    title: "空席がひと目でわかる",
    description:
      "リアルタイムの空席状況を確認。「空席あり」「混雑」「満席」がひと目でわかります。",
  },
  {
    icon: Calendar,
    title: "そのまま予約できる",
    description:
      "気になるお店を見つけたら、そのまま予約。電話不要でスムーズに席を確保できます。",
  },
] as const;

const PLANS = [
  {
    name: "無料プラン",
    price: "¥0",
    period: "",
    features: ["店舗掲載", "Instagram URL登録（6件）", "基本プロフィール"],
    highlighted: false,
  },
  {
    name: "スタンダード",
    price: "¥9,800",
    period: "/月",
    features: [
      "無料プランの全機能",
      "空席リアルタイム更新",
      "予約受付",
      "基本分析レポート",
    ],
    highlighted: true,
  },
  {
    name: "プレミアム",
    price: "¥29,800",
    period: "/月",
    features: [
      "スタンダードの全機能",
      "AI投稿最適化",
      "詳細分析ダッシュボード",
      "優先表示",
      "専任サポート",
    ],
    highlighted: false,
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-4 py-3 md:px-8">
        <span className="text-2xl font-bold text-orange-500">Kuuu</span>
        <Link href="/login">
          <Button variant="ghost" size="sm">
            ログイン
          </Button>
        </Link>
      </header>

      {/* ヒーローセクション */}
      <section className="px-4 py-16 text-center md:py-24">
        <h1 className="text-3xl font-bold text-gray-900 text-balance md:text-5xl">
          好きなお店の&quot;今&quot;が見える
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-gray-500 text-pretty">
          近くの飲食店のリアルタイム情報をInstagramから。
          空席確認・予約もできる飲食店SNS。
        </p>
        <div className="mt-8">
          <Link href="/signup">
            <Button variant="primary" size="lg">
              無料ではじめる
            </Button>
          </Link>
        </div>
      </section>

      {/* 機能セクション */}
      <section className="bg-gray-50 px-4 py-16 md:py-20">
        <h2 className="text-center text-2xl font-bold text-gray-900 text-balance md:text-3xl">
          Kuuuでできること
        </h2>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-orange-100">
                  <feature.icon className="size-6 text-orange-500" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 text-pretty">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* オーナー向けセクション */}
      <section className="px-4 py-16 md:py-20">
        <h2 className="text-center text-2xl font-bold text-gray-900 text-balance md:text-3xl">
          あなたのお店も掲載しませんか？
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-gray-500 text-pretty">
          Instagramと連携するだけで、お店の最新情報を自動で発信。新しいお客様との出会いを生み出します。
        </p>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={
                plan.highlighted
                  ? "border-orange-500 ring-1 ring-orange-500"
                  : undefined
              }
            >
              <CardContent className="p-6">
                {plan.highlighted && (
                  <span className="mb-3 inline-block rounded-full bg-orange-100 px-3 py-0.5 text-xs font-medium text-orange-600">
                    おすすめ
                  </span>
                )}
                <h3 className="text-lg font-bold text-gray-900">
                  {plan.name}
                </h3>
                <p className="mt-2">
                  <span className="text-3xl font-bold text-gray-900 tabular-nums">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-gray-500">{plan.period}</span>
                  )}
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <span className="mt-0.5 text-orange-500">&#10003;</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/signup">
            <Button variant="primary" size="lg">
              店舗オーナーとして登録
            </Button>
          </Link>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t border-gray-200 bg-gray-50 px-4 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 md:flex-row md:justify-between">
          <span className="text-lg font-bold text-orange-500">Kuuu</span>
          <nav className="flex gap-6 text-sm text-gray-500">
            <Link href="/login" className="hover:text-gray-700">
              ログイン
            </Link>
            <Link href="/terms" className="hover:text-gray-700">
              利用規約
            </Link>
            <Link href="/privacy" className="hover:text-gray-700">
              プライバシーポリシー
            </Link>
          </nav>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Kuuu. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
