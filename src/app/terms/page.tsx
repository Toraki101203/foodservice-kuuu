import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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

        <h1 className="text-2xl font-bold text-gray-900 text-balance">利用規約</h1>
        <p className="mt-2 text-sm text-gray-500">最終更新日: 2026年4月4日</p>

        <div className="mt-8 space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">第1条（適用）</h2>
            <p>
              本規約は、モグリス（以下「本サービス」）の利用に関する条件を定めるものです。
              ユーザーは本規約に同意の上、本サービスをご利用ください。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">第2条（アカウント）</h2>
            <p>
              ユーザーは正確な情報を登録し、アカウント情報を適切に管理する責任を負います。
              第三者にアカウントを貸与・譲渡することはできません。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">第3条（禁止事項）</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>法令に違反する行為</li>
              <li>他のユーザーまたは第三者の権利を侵害する行為</li>
              <li>虚偽の情報を登録する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>不正アクセスまたはそれを試みる行為</li>
              <li>スクレイピング等の自動収集行為</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">第4条（店舗情報）</h2>
            <p>
              店舗オーナーは正確な店舗情報を掲載する責任を負います。
              空席情報は店舗オーナーが管理し、本サービスはその正確性を保証しません。
              Instagram連携による投稿は、店舗オーナーのInstagramアカウントから取得されます。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">第5条（有料プラン）</h2>
            <p>
              有料プランの料金は本サービス内に表示される金額とします。
              決済はStripeを通じて処理されます。
              解約は請求期間の終了時に有効となり、即時の返金は行いません。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">第6条（免責事項）</h2>
            <p>
              本サービスは現状有姿で提供され、特定の目的への適合性を保証しません。
              店舗情報、空席情報、予約に関するトラブルについて、
              本サービスは一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">第7条（変更）</h2>
            <p>
              本規約は予告なく変更される場合があります。
              変更後のサービス利用をもって、変更後の規約に同意したものとみなします。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
