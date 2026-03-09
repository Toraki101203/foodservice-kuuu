"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import type { User } from "@/types/database";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const setUser = useAuthStore((s) => s.setUser);
    const setLoading = useAuthStore((s) => s.setLoading);

    useEffect(() => {
        const supabase = createClient();

        const loadUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", authUser.id)
                    .single();
                setUser(profile as User | null);
            } else {
                setUser(null);
            }
            setLoading(false);
        };

        loadUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", session.user.id)
                    .single();
                setUser(profile as User | null);
            } else {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [setUser, setLoading]);

    return <>{children}</>;
}
