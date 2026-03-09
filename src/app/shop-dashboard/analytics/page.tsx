import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnalyticsDashboardClient } from "./analytics-client";

export default async function AnalyticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: shop } = await supabase
        .from("shops")
        .select("id, plan_type")
        .eq("owner_id", user.id)
        .single();

    if (!shop) redirect("/shop-dashboard/profile");

    if (shop.plan_type !== "premium") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <h1 className="text-xl font-bold text-gray-900">集客分析</h1>
                <p className="mt-3 text-sm text-gray-500">
                    プレミアムプランにアップグレードすると、<br />
                    詳細な集客分析とAI投稿最適化提案が利用できます。
                </p>
                <a
                    href="/shop-dashboard/billing"
                    className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-6 font-bold text-white hover:bg-orange-600"
                >
                    プランをアップグレード
                </a>
            </div>
        );
    }

    const { data: events } = await supabase
        .from("analytics_events")
        .select("*")
        .eq("restaurant_id", shop.id)
        .order("created_at", { ascending: false })
        .limit(1000);

    return <AnalyticsDashboardClient events={events ?? []} shopId={shop.id} />;
}
