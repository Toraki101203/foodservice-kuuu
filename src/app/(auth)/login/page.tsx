"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

        if (authError) {
            setError("メールアドレスまたはパスワードが正しくありません");
            setIsLoading(false);
            return;
        }
        router.push("/");
        router.refresh();
    };

    return (
        <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-orange-500">Kuuu</h1>
                <p className="mt-2 text-sm text-gray-500">アカウントにログイン</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    id="email"
                    label="メールアドレス"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                />
                <Input
                    id="password"
                    label="パスワード"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8文字以上"
                    required
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" isLoading={isLoading}>
                    ログイン
                </Button>
            </form>
            <p className="text-center text-sm text-gray-500">
                アカウントをお持ちでない方{" "}
                <Link href="/signup" className="font-medium text-orange-500">
                    新規登録
                </Link>
            </p>
        </div>
    );
}
