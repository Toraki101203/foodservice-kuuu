import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// 通知一覧を取得
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit")) || 50;
  const offset = Number(request.nextUrl.searchParams.get("offset")) || 0;

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: "通知の取得に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ notifications });
}

// 通知を既読にする
// body: { ids?: string[] } — ids 指定時はその通知のみ、未指定時は全て既読
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { ids } = body;

  let query = supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id);

  if (Array.isArray(ids) && ids.length > 0) {
    query = query.in("id", ids);
  } else {
    query = query.eq("is_read", false);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "更新に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
