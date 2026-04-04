import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: { postId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { postId } = body;

  if (!postId) {
    return NextResponse.json(
      { error: "投稿IDが必要です" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("post_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "既に保存済みです" },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("post_favorites")
    .insert({ user_id: user.id, post_id: postId });

  if (error) {
    return NextResponse.json(
      { error: "保存に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: { postId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { postId } = body;

  if (!postId) {
    return NextResponse.json(
      { error: "投稿IDが必要です" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("post_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("post_id", postId);

  if (error) {
    return NextResponse.json(
      { error: "保存の解除に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
