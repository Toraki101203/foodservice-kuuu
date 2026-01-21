"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/**
 * ログインページ
 */
export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError("メールアドレスまたはパスワードが正しくありません。");
                return;
            }

            router.push("/home");
            router.refresh();
        } catch {
            setError("ログインに失敗しました。もう一度お試しください。");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center px-4">
            <div className="w-full max-w-sm">
                {/* ロゴ */}
                <div className="mb-8 text-center">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-2xl">
                            K
                        </div>
                        <span className="text-3xl font-bold text-gray-900">Kuuu</span>
                    </Link>
                    <p className="mt-2 text-gray-600">アカウントにログイン</p>
                </div>

                {/* フォーム */}
                <form onSubmit={handleLogin} className="space-y-4">
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
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
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
                        ログイン
                    </Button>
                </form>

                {/* リンク */}
                <div className="mt-6 space-y-4 text-center text-sm">
                    <Link
                        href="/forgot-password"
                        className="text-orange-500 hover:underline"
                    >
                        パスワードを忘れた方
                    </Link>
                    <p className="text-gray-600">
                        アカウントをお持ちでない方は{" "}
                        <Link href="/signup" className="text-orange-500 hover:underline">
                            新規登録
                        </Link>
                    </p>
                </div>

                {/* ソーシャルログイン */}
                <div className="mt-8">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-gray-50 px-4 text-gray-500">または</span>
                        </div>
                    </div>
                    <div className="mt-6 space-y-3">
                        <Button variant="outline" className="w-full" size="lg">
                            <svg className="mr-2 size-5" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Googleでログイン
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
