import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "メールアドレスとパスワードは必須です" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid login credentials")) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }
    if (msg.includes("email not confirmed")) {
      return NextResponse.json(
        { error: "メールアドレスが未確認です。確認メールをご確認ください。" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "ログインに失敗しました。もう一度お試しください。" },
      { status: 401 }
    );
  }

  return NextResponse.json({ user: data.user });
}
