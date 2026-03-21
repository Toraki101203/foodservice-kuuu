import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 管理者チェック（本番ではロールベースの権限管理を実装）
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/");

  const [{ data: shops }, { data: profiles }, { data: subscriptions }] =
    await Promise.all([
      supabase
        .from("shops")
        .select("id, name, plan_type, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, display_name, role, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("subscriptions")
        .select("*, shops(name)")
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">管理画面</h1>
      </header>
      <main className="mx-auto max-w-6xl space-y-8 p-4">
        {/* 統計 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">登録店舗数</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {shops?.length ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">登録ユーザー数</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {profiles?.length ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">有料プラン</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {subscriptions?.filter((s) => s.status === "active").length ?? 0}
            </p>
          </div>
        </div>

        {/* 店舗一覧 */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">店舗一覧</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    店舗名
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    プラン
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    登録日
                  </th>
                </tr>
              </thead>
              <tbody>
                {shops?.map((shop) => (
                  <tr key={shop.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-900">{shop.name}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {shop.plan_type}
                    </td>
                    <td className="px-4 py-2 text-gray-600 tabular-nums">
                      {new Date(shop.created_at).toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                ))}
                {(!shops || shops.length === 0) && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      登録店舗がありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ユーザー一覧 */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">
            ユーザー一覧（最新50件）
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    表示名
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    タイプ
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    登録日
                  </th>
                </tr>
              </thead>
              <tbody>
                {profiles?.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-900">{p.display_name ?? "未設定"}</td>
                    <td className="px-4 py-2 text-gray-600">{p.role}</td>
                    <td className="px-4 py-2 text-gray-600 tabular-nums">
                      {new Date(p.created_at).toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                ))}
                {(!profiles || profiles.length === 0) && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      ユーザーがいません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
