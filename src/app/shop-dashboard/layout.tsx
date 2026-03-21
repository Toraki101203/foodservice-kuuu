import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // role チェック: shop_owner のみダッシュボードアクセス可
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "shop_owner") {
    redirect("/");
  }

  // 店舗データの取得（最も古い店舗を優先して取得）
  let { data: shop } = await supabase
    .from("shops")
    .select("id, name, plan_type, main_image, genre, description, address, phone, budget_lunch_min, budget_lunch_max, budget_dinner_min, budget_dinner_max, business_hours, owner_id, instagram_username, instagram_user_id, instagram_url, instagram_synced_at, instagram_token_expires_at, latitude, longitude, is_verified, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!shop) {
    // 初回アクセス時のみ店舗を自動作成（既存店舗がない場合のみ）
    const { data: newShop } = await supabase
      .from("shops")
      .insert({ owner_id: user.id, name: "新しい店舗" })
      .select()
      .single();
    shop = newShop;

    if (shop) {
      await supabase
        .from("seat_status")
        .insert({ shop_id: shop.id, status: "closed" });
    }
  }

  if (!shop) redirect("/");

  return (
    <div className="min-h-dvh bg-gray-50">
      <Sidebar shop={shop} />
      <main className="p-4 pt-14 md:ml-64 md:pt-4">{children}</main>
    </div>
  );
}
