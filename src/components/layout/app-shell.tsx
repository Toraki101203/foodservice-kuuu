"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";

const HIDE_SHELL_ROUTES = ["/login", "/signup", "/landing", "/shop-dashboard", "/partner", "/admin"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideShell = HIDE_SHELL_ROUTES.some((r) => pathname.startsWith(r));

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="min-h-dvh pt-14 pb-20">{children}</main>
      <BottomNav />
    </>
  );
}
