"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type UserType = "general" | "restaurant";

/**
 * 新規登録ページ
 */
export default function SignupPage() {
    return (
        <Suspense>
            <SignupForm />
        </Suspense>
    );
}

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialType = (searchParams.get("type") as UserType) || "general";

    const [userType, setUserType] = useState<UserType>(initialType);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (password !== confirmPassword) {
            setError("パスワードが一致しません。");
            setIsLoading(false);
            return;
        }

        if (password.length < 8) {
            setError("パスワードは8文字以上で設定してください。");
            setIsLoading(false);
            return;
        }

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: displayName,
                        user_type: userType === "restaurant" ? "restaurant_owner" : "general",
                    },
                },
            });

            if (error) {
                if (error.message.includes("already registered")) {
                    setError("このメールアドレスは既に登録されています。");
                } else {
                    setError("登録に失敗しました。もう一度お試しください。");
                }
                return;
            }

            // 登録成功
            router.push("/");
            router.refresh();
        } catch {
            setError("登録に失敗しました。もう一度お試しください。");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
            <div className="w-full max-w-sm">
                {/* ロゴ */}
                <div className="mb-6 text-center">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-2xl">
                            K
                        </div>
                        <span className="text-3xl font-bold text-gray-900">Kuuu</span>
                    </Link>
                    <p className="mt-2 text-gray-600">新規アカウント作成</p>
                </div>

                {/* アカウントタイプ選択 */}
                <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
                    <button
                        type="button"
                        onClick={() => setUserType("general")}
                        className={cn(
                            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                            userType === "general"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        一般ユーザー
                    </button>
                    <button
                        type="button"
                        onClick={() => setUserType("restaurant")}
                        className={cn(
                            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                            userType === "restaurant"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        店舗オーナー
                    </button>
                </div>

                {/* フォーム */}
                <form onSubmit={handleSignup} className="space-y-4">
                    <Input
                        type="text"
                        label={userType === "restaurant" ? "店舗名 / 代表者名" : "表示名"}
                        placeholder={
                            userType === "restaurant" ? "例: 麺屋 Kuuu" : "例: 田中太郎"
                        }
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                    />

                    <Input
                        type="email"
                        label="メールアドレス"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />

                    <Input
                        type="password"
                        label="パスワード"
                        placeholder="8文字以上"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        helperText="8文字以上で設定してください"
                    />

                    <Input
                        type="password"
                        label="パスワード（確認）"
                        placeholder="もう一度入力"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />

                    {error && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        isLoading={isLoading}
                    >
                        {userType === "restaurant" ? "店舗として登録" : "アカウントを作成"}
                    </Button>
                </form>

                {/* 利用規約 */}
                <p className="mt-4 text-center text-xs text-gray-500">
                    登録することで、
                    <Link href="/terms" className="text-orange-500 hover:underline">
                        利用規約
                    </Link>
                    と
                    <Link href="/privacy" className="text-orange-500 hover:underline">
                        プライバシーポリシー
                    </Link>
                    に同意したものとみなされます。
                </p>

                {/* ログインリンク */}
                <p className="mt-6 text-center text-sm text-gray-600">
                    既にアカウントをお持ちの方は{" "}
                    <Link href="/login" className="text-orange-500 hover:underline">
                        ログイン
                    </Link>
                </p>
            </div>
        </div>
    );
}
