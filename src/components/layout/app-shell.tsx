"use client";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";

const DASHBOARD_PREFIX = "/shop-dashboard";
const AUTH_PATHS = ["/login", "/signup"];
const NO_SHELL_PATHS = ["/landing"];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isDashboard = pathname.startsWith(DASHBOARD_PREFIX);
    const isAuth = AUTH_PATHS.some((p) => pathname.startsWith(p));
    const noShell = NO_SHELL_PATHS.includes(pathname);

    if (isAuth || noShell) return <>{children}</>;
    if (isDashboard) return <>{children}</>;

    return (
        <>
            <Header />
            <main className="pt-14 pb-20">{children}</main>
            <BottomNav />
        </>
    );
}
