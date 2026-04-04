import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <SearchX className="size-16 text-gray-300" />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-orange-500 px-6 py-3 text-sm font-medium text-white active:bg-orange-600"
      >
        ホームに戻る
      </Link>
    </div>
  );
}
