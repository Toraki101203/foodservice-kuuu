import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, genre, plan_type")
    .eq("owner_id", user.id)
    .single();

  if (!shop) redirect("/");

  // プレミアムプラン以外はアップグレード案内を表示
  if (shop.plan_type !== "premium") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">集客分析</h1>
          <p className="mt-1 text-sm text-gray-500">
            お店のパフォーマンスを詳しく分析できます
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-orange-50">
              <Crown className="size-8 text-orange-500" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">
              プレミアムプラン限定機能
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500 leading-relaxed text-pretty">
              詳細な集客分析やAI投稿最適化提案は、プレミアムプランでご利用いただけます。
            </p>
            <div className="mt-6">
              <Link
                href="/shop-dashboard/billing"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-orange-500 px-6 text-sm font-medium text-white hover:bg-orange-600"
              >
                プランをアップグレード
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // プレミアムプラン: 分析データを取得
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [
    { data: events },
    { count: totalViews },
    { count: totalFavorites },
    { count: totalReservations },
  ] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("*")
      .eq("shop_id", shop.id)
      .gte("created_at", ninetyDaysAgo.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .eq("event_type", "view")
      .gte("created_at", ninetyDaysAgo.toISOString()),
    supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id),
    supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .gte("created_at", ninetyDaysAgo.toISOString()),
  ]);

  return (
    <AnalyticsClient
      shopId={shop.id}
      events={events ?? []}
      totalStats={{
        views: totalViews ?? 0,
        favorites: totalFavorites ?? 0,
        reservations: totalReservations ?? 0,
      }}
    />
  );
}
