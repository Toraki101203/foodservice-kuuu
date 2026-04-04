"use client";

import { AlertCircle } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <AlertCircle className="size-16 text-red-300" />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">エラーが発生しました</h1>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed">
        一時的な問題が発生しました。しばらく経ってからもう一度お試しください。
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-orange-500 px-6 py-3 text-sm font-medium text-white active:bg-orange-600"
      >
        もう一度試す
      </button>
    </div>
  );
}
