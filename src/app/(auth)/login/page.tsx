"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "ログインに失敗しました。");
        return;
      }

      // フルページリロードでサーバー側セッションを反映
      window.location.href = "/";
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ロゴ */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-orange-500">Kuuu</h1>
        <p className="mt-1 text-sm text-gray-500">アカウントにログイン</p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ログインフォーム */}
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
        <Input
          label="パスワード"
          type="password"
          placeholder="パスワードを入力"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          ログイン
        </Button>
      </form>

      {/* リンク */}
      <div className="space-y-2 text-center text-sm">
        <p>
          <Link
            href="/signup"
            className="text-orange-500 hover:text-orange-600"
          >
            アカウントをお持ちでない方
          </Link>
        </p>
        <p>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700"
            onClick={() => {
              // パスワードリセット機能（将来実装）
            }}
          >
            パスワードを忘れた方
          </button>
        </p>
      </div>
    </div>
  );
}
