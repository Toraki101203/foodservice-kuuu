import Link from "next/link";
import { Flame } from "lucide-react";

export default function Footer() {
    return (
        <footer className="hidden border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)] md:block">
            <div className="mx-auto max-w-5xl px-4 py-8">
                <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
                    {/* ロゴ */}
                    <Link href="/" className="flex items-center gap-2">
                        <Flame className="size-5 text-[var(--color-primary)]" />
                        <span className="text-lg font-bold text-[var(--color-secondary)]">
                            NOW
                        </span>
                    </Link>

                    {/* リンク */}
                    <nav className="flex gap-6 text-sm text-[var(--color-text-secondary)]">
                        <Link href="/" className="transition-colors hover:text-[var(--color-text-primary)]">
                            タイムライン
                        </Link>
                        <Link href="/about" className="transition-colors hover:text-[var(--color-text-primary)]">
                            NOWとは
                        </Link>
                    </nav>

                    {/* コピーライト */}
                    <p className="text-xs text-[var(--color-text-muted)]">
                        &copy; {new Date().getFullYear()} NOW. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
