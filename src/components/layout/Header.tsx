"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

interface HeaderProps {
    title?: string;
    showLogo?: boolean;
    className?: string;
}

/**
 * ヘッダーコンポーネント
 */
export function Header({ title, showLogo = true, className }: HeaderProps) {
    const { user } = useAuthStore();

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-white",
                className
            )}
        >
            <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
                {showLogo ? (
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500 text-white font-bold text-lg">
                            K
                        </div>
                        <span className="text-xl font-bold text-gray-900">Kuuu β</span>
                    </Link>
                ) : (
                    <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
                )}

                {user && (
                    <Link
                        href="/mypage"
                        className="flex size-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-medium text-sm"
                    >
                        {user.display_name?.charAt(0).toUpperCase() || "U"}
                    </Link>
                )}
            </div>
        </header>
    );
}
