"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致しません。");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError("パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。");
        return;
      }

      setIsUpdated(true);
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  if (isUpdated) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-50">
          <Check className="size-8 text-green-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">パスワードを更新しました</h1>
          <p className="mt-2 text-sm text-gray-500">
            3秒後に自動でホームに移動します...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900">新しいパスワードを設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          8文字以上の新しいパスワードを入力してください。
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="新しいパスワード"
          type="password"
          placeholder="8文字以上"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Input
          label="パスワード（確認）"
          type="password"
          placeholder="もう一度入力"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          パスワードを更新
        </Button>
      </form>
    </div>
  );
}
