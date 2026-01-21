import Link from "next/link";
import { Button } from "@/components/ui";

/**
 * ランディングページ（未ログイン時）
 */
export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-orange-50 to-white">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-4 py-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-xl">
            K
          </div>
          <span className="text-2xl font-bold text-gray-900">Kuuu</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              ログイン
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">新規登録</Button>
          </Link>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="px-4 py-12 text-center md:py-20">
        <h1 className="mb-4 text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
          飲食店の
          <span className="text-orange-500">「今」</span>
          がわかる
        </h1>
        <p className="mx-auto mb-8 max-w-md text-lg text-gray-600 leading-relaxed">
          リアルタイムで空席状況をチェック。
          <br />
          予約もその場で完了できます。
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/home">
            <Button size="lg" className="w-full sm:w-auto">
              今すぐ始める
            </Button>
          </Link>
          <Link href="/signup?type=restaurant">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              店舗として登録
            </Button>
          </Link>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="bg-white px-4 py-12 md:py-20">
        <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 md:text-3xl">
          Kuuu でできること
        </h2>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          {/* 特徴1 */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-green-100 text-3xl">
              🟢
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              リアルタイム席状況
            </h3>
            <p className="text-gray-600 leading-relaxed">
              空席・混雑・満席が一目でわかる。
              今すぐ入れるお店を簡単に見つけられます。
            </p>
          </div>

          {/* 特徴2 */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
              🗺️
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              地図で発見
            </h3>
            <p className="text-gray-600 leading-relaxed">
              現在地から近くの飲食店をマップ上で探せます。
              フィルターで絞り込みも簡単。
            </p>
          </div>

          {/* 特徴3 */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-orange-100 text-3xl">
              📱
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              かんたん予約
            </h3>
            <p className="text-gray-600 leading-relaxed">
              気になるお店を見つけたら、
              その場で予約。手数料は一切かかりません。
            </p>
          </div>
        </div>
      </section>

      {/* 店舗向けセクション */}
      <section className="px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 p-8 text-center text-white md:p-12">
          <h2 className="mb-4 text-2xl font-bold md:text-3xl">
            飲食店オーナーの皆様へ
          </h2>
          <p className="mb-6 text-orange-100 leading-relaxed md:text-lg">
            予約手数料0円で集客力アップ。
            <br />
            リアルタイムで席状況を発信して、お客様との接点を増やしましょう。
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup?type=restaurant">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                店舗登録はこちら
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                size="lg"
                className="w-full border-white text-white hover:bg-white/20 sm:w-auto"
              >
                料金プランを見る
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t border-gray-200 bg-white px-4 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500 text-white font-bold">
              K
            </div>
            <span className="text-xl font-bold text-gray-900">Kuuu</span>
          </div>
          <nav className="mb-4 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <Link href="/about" className="hover:text-orange-500">
              Kuuuについて
            </Link>
            <Link href="/terms" className="hover:text-orange-500">
              利用規約
            </Link>
            <Link href="/privacy" className="hover:text-orange-500">
              プライバシーポリシー
            </Link>
            <Link href="/contact" className="hover:text-orange-500">
              お問い合わせ
            </Link>
          </nav>
          <p className="text-sm text-gray-400">
            © 2026 Kuuu. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
