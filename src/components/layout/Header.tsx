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
                "sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md",
                className
            )}
        >
            <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
                {showLogo ? (
                    <Link href="/home" className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500 text-white font-bold text-lg">
                            K
                        </div>
                        <span className="text-xl font-bold text-gray-900">Kuuu</span>
                    </Link>
                ) : (
                    <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
                )}

                {user && (
                    <Link
                        href="/profile"
                        className="flex size-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-medium text-sm"
                    >
                        {user.display_name?.charAt(0).toUpperCase() || "U"}
                    </Link>
                )}
            </div>
        </header>
    );
}
