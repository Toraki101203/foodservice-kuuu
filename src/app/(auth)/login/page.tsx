"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "メールアドレスまたはパスワードが正しくありません"
          : "ログインに失敗しました。もう一度お試しください。"
      );
      setIsLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
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
