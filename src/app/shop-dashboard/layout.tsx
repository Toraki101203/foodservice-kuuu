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

  // 店舗データの取得・作成
  let { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!shop) {
    // 初回アクセス時に店舗を自動作成
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
