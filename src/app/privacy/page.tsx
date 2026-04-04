import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/landing"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
          戻る
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 text-balance">プライバシーポリシー</h1>
        <p className="mt-2 text-sm text-gray-500">最終更新日: 2026年4月4日</p>

        <div className="mt-8 space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">1. 収集する情報</h2>
            <p>本サービスでは以下の情報を収集します:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><span className="font-medium">アカウント情報:</span> メールアドレス、パスワード（暗号化して保存）</li>
              <li><span className="font-medium">店舗情報:</span> 店名、住所、電話番号、ジャンル、営業時間、予算帯</li>
              <li><span className="font-medium">Instagram連携情報:</span> Instagramユーザー名、投稿データ（連携を許可した場合のみ）</li>
              <li><span className="font-medium">利用情報:</span> 閲覧履歴、検索履歴、お気に入り、予約履歴</li>
              <li><span className="font-medium">位置情報:</span> 近くの店舗を表示するため（許可した場合のみ）</li>
              <li><span className="font-medium">決済情報:</span> Stripe を通じて処理（カード情報は本サービスでは保存しません）</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">2. 情報の利用目的</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>本サービスの提供・運営・改善</li>
              <li>ユーザーに適した店舗情報の表示</li>
              <li>予約の管理・通知</li>
              <li>有料プランの決済処理</li>
              <li>サービスの利用状況の分析</li>
              <li>不正利用の防止</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">3. 第三者への提供</h2>
            <p>以下の場合を除き、個人情報を第三者に提供しません:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>サービス提供に必要な業務委託先（Supabase、Stripe、Instagram/Meta）への提供</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">4. 外部サービスとの連携</h2>
            <p>本サービスは以下の外部サービスと連携しています:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><span className="font-medium">Supabase:</span> データベース・認証基盤</li>
              <li><span className="font-medium">Stripe:</span> 決済処理（PCI DSS 準拠）</li>
              <li><span className="font-medium">Instagram (Meta):</span> 店舗投稿の連携</li>
              <li><span className="font-medium">Google Maps:</span> 地図表示</li>
            </ul>
            <p className="mt-2">
              各サービスのプライバシーポリシーについては、それぞれの公式サイトをご確認ください。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">5. データの保管</h2>
            <p>
              個人情報は適切なセキュリティ対策を講じた環境で保管します。
              アカウント削除の際は、関連する個人情報を速やかに削除します。
              ただし、法令で保存が求められる情報については、必要な期間保管します。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">6. Cookie の利用</h2>
            <p>
              本サービスはセッション管理のために Cookie を使用します。
              ブラウザの設定で Cookie を無効にすることもできますが、
              一部の機能が利用できなくなる場合があります。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">7. お問い合わせ</h2>
            <p>
              プライバシーに関するお問い合わせは、アプリ内のお問い合わせフォーム
              またはメールにてご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">8. 変更</h2>
            <p>
              本ポリシーは予告なく変更される場合があります。
              重要な変更がある場合は、本サービス内で通知します。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
