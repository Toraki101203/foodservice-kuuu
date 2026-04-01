import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // レート制限: 5回/分（ブルートフォース防止）
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = checkRateLimit(`login:${ip}`, { maxRequests: 5, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらく経ってからお試しください。" },
      { status: 429 }
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }
  const { email, password } = body;

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
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
