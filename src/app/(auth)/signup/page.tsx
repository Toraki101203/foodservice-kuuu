"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import Link from "next/link";

type UserType = "general" | "restaurant_owner";

export default function SignupPage() {
    const [userType, setUserType] = useState<UserType>("general");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, displayName, userType }),
        });

        if (!res.ok) {
            const data = await res.json();
            setError(data.error ?? "登録に失敗しました");
            setIsLoading(false);
            return;
        }
        router.push("/login?registered=true");
    };

    return (
        <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-orange-500">Kuuu</h1>
                <p className="mt-2 text-sm text-gray-500">新しいアカウントを作成</p>
            </div>
            <div className="flex gap-2">
                {(["general", "restaurant_owner"] as const).map((type) => (
                    <button
                        key={type}
                        onClick={() => setUserType(type)}
                        className={`flex-1 rounded-xl border py-3 text-sm font-medium transition-colors ${
                            userType === type
                                ? "border-orange-500 bg-orange-50 text-orange-600"
                                : "border-gray-200 text-gray-500"
                        }`}
                    >
                        {type === "general" ? "お店を探す方" : "店舗オーナーの方"}
                    </button>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input id="displayName" label="表示名" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                <Input id="email" label="メールアドレス" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Input id="password" label="パスワード" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8文字以上" required />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" isLoading={isLoading}>アカウントを作成</Button>
            </form>
            <p className="text-center text-sm text-gray-500">
                すでにアカウントをお持ちの方{" "}
                <Link href="/login" className="font-medium text-orange-500">ログイン</Link>
            </p>
        </div>
    );
}
