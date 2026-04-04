import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // レート制限: 3回/分（悪用防止）
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = checkRateLimit(`reset:${ip}`, { maxRequests: 3, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらく経ってからお試しください。" },
      { status: 429 }
    );
  }

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { email } = body;
  if (typeof email !== "string" || !email) {
    return NextResponse.json(
      { error: "メールアドレスを入力してください" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/update-password`,
  });

  // メールの存在有無に関わらず同じレスポンスを返す（ユーザー列挙防止）
  return NextResponse.json({
    message: "パスワードリセットメールを送信しました。メールをご確認ください。",
  });
}
