"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserType } from "@/types/database";

export default function SignupPage() {
  const [userType, setUserType] = useState<UserType>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, userType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "アカウントの作成に失敗しました");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  // 確認メール送信完了画面
  if (success) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-3xl font-bold text-orange-500">モグリス</h1>
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-6">
          <p className="font-medium text-green-800">確認メールを送信しました</p>
          <p className="mt-2 text-sm text-green-600">
            {email} に確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block text-sm text-orange-500 hover:text-orange-600"
        >
          ログインページへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ロゴ */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-orange-500">モグリス</h1>
        <p className="mt-1 text-sm text-gray-500">新規アカウント作成</p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* アカウントタイプ選択 */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">アカウントタイプ</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUserType("user")}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                userType === "user"
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              お店を探す方
            </button>
            <button
              type="button"
              onClick={() => setUserType("shop_owner")}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                userType === "shop_owner"
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              店舗オーナーの方
            </button>
          </div>
        </div>

        <Input
          label="メールアドレス"
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="パスワード"
          type="password"
          placeholder="8文字以上のパスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          アカウントを作成
        </Button>
      </form>

      {/* リンク */}
      <p className="text-center text-sm">
        <Link
          href="/login"
          className="text-orange-500 hover:text-orange-600"
        >
          すでにアカウントをお持ちの方
        </Link>
      </p>
    </div>
  );
}
