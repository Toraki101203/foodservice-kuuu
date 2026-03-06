import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!shop) redirect("/shop-dashboard");

  // プレミアム限定 — free/standard はアップグレード案内
  if (shop.plan_type !== "premium") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex min-h-[50dvh] flex-col items-center justify-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-orange-50">
            <TrendingUp className="size-8 text-orange-500" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-[var(--color-text-primary)]">
            プレミアムプラン限定
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            集客分析ダッシュボードはプレミアムプランでご利用いただけます。
            <br />
            アクセス数、予約転換率、時間帯別分析で集客を最大化しましょう。
          </p>
          <Link
            href="/shop-dashboard/billing"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 font-bold text-white hover:bg-[var(--color-primary-hover)]"
          >
            プランをアップグレード
          </Link>
        </div>
      </div>
    );
  }

  // 過去90日分のイベントを取得（フロント側で7/30/90日フィルタ）
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: events } = await supabase
    .from("analytics_events")
    .select("*")
    .eq("restaurant_id", shop.id)
    .gte("created_at", ninetyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
        集客分析
      </h1>
      <AnalyticsCharts events={events || []} shopName={shop.name} />
    </div>
  );
}
