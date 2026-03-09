import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("user_type").eq("id", user.id).single();
    if (profile?.user_type !== "restaurant_owner") redirect("/");

    return (
        <div className="flex min-h-dvh bg-gray-50">
            <Sidebar />
            <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
                {children}
            </main>
        </div>
    );
}
