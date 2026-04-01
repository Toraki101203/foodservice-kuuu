import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// admin はサインアップで設定不可（管理者が手動で付与）
const ALLOWED_USER_TYPES = ["user", "shop_owner"] as const;

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; userType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { email, password, userType } = body;

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json(
      { error: "メールアドレスとパスワードは必須です" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "パスワードは8文字以上で入力してください" },
      { status: 400 }
    );
  }

  const validUserType = ALLOWED_USER_TYPES.includes(userType as typeof ALLOWED_USER_TYPES[number])
    ? (userType as string)
    : "user";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: validUserType,
      },
    },
  });

  if (error) {
    // Supabase のエラーメッセージをそのまま返さない（ユーザー列挙攻撃防止）
    return NextResponse.json(
      { error: "登録に失敗しました。入力内容をご確認ください。" },
      { status: 400 }
    );
  }

  return NextResponse.json({ user: data.user });
}
