import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // 「新しい店舗」の重複を削除（オリジナルの「テスト店舗」は残す）
  const { data: duplicates } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .eq("name", "新しい店舗");

  if (!duplicates || duplicates.length === 0) {
    return NextResponse.json({ message: "削除対象なし", deleted: 0 });
  }

  const ids = duplicates.map((d) => d.id);

  // 関連する seat_status を先に削除
  await supabase.from("seat_status").delete().in("shop_id", ids);

  // 重複店舗を削除
  const { error } = await supabase.from("shops").delete().in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "クリーンアップ完了", deleted: ids.length });
}
