"use client";

import { useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store";

const PROTECTED_ROUTES = ["/favorites", "/mypage", "/notifications", "/reservations", "/shop-dashboard"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const pathname = usePathname();
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  // 初回マウント時 + ページ遷移時にサーバーからユーザー情報を取得
  useEffect(() => {
    fetchUser();
  }, [fetchUser, pathname]);

  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && !user && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
      router.push("/login");
    }
  }, [pathname, router, user, isLoading]);

  return <>{children}</>;
}
