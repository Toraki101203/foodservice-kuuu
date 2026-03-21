import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_USER_TYPES = ["user", "shop_owner", "admin"] as const;

export async function POST(request: Request) {
  const { email, password, userType } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "メールアドレスとパスワードは必須です" },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "パスワードは8文字以上で入力してください" },
      { status: 400 }
    );
  }

  const validUserType = ALLOWED_USER_TYPES.includes(userType)
    ? userType
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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user });
}
