"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました。");
        return;
      }

      setIsSent(true);
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-50">
          <Check className="size-8 text-green-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">メールを送信しました</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            <span className="font-medium text-gray-700">{email}</span> 宛に
            パスワードリセットメールを送信しました。
            メール内のリンクから新しいパスワードを設定してください。
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block text-sm text-orange-500 hover:text-orange-600"
        >
          ログインに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900">パスワードをリセット</h1>
        <p className="mt-1 text-sm text-gray-500 leading-relaxed">
          登録済みのメールアドレスを入力してください。
          パスワードリセット用のリンクをお送りします。
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="メールアドレス"
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          リセットメールを送信
        </Button>
      </form>

      <div className="text-center text-sm">
        <Link
          href="/login"
          className="text-orange-500 hover:text-orange-600"
        >
          ログインに戻る
        </Link>
      </div>
    </div>
  );
}
