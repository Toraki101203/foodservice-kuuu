"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import type { User, UserType } from "@/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setLoading } = useAuthStore();
    const supabase = createClient();

    useEffect(() => {
        const loadUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session?.user) {
                    setUser(null);
                    setLoading(false);
                    return;
                }

                const authUser = session.user;
                const userType = (authUser.user_metadata?.user_type as UserType) || "general";

                // プロフィール情報を取得
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", authUser.id)
                    .maybeSingle();

                const userData: User = {
                    id: authUser.id,
                    email: authUser.email || "",
                    user_type: userType,
                    display_name: profile?.display_name || authUser.user_metadata?.display_name || null,
                    avatar_url: profile?.avatar_url || null,
                    bio: profile?.bio || null,
                    created_at: authUser.created_at,
                };

                setUser(userData);
            } catch (error) {
                console.error("Auth fetch error:", error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        loadUser();

        // ログイン状態の変更を監視
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_OUT" || !session) {
                setUser(null);
            } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                loadUser();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [setUser, setLoading, supabase]);

    return <>{children}</>;
}
