import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * サインアップ API — service_role でメール確認をスキップ
 */
export async function POST(request: NextRequest) {
    try {
        const { email, password, displayName, userType } = await request.json();

        if (!email || !password || !displayName || !userType) {
            return NextResponse.json(
                { error: "必須項目が不足しています。" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "パスワードは8文字以上で設定してください。" },
                { status: 400 }
            );
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // service_role で作成 → メール確認不要
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                display_name: displayName,
                user_type: userType,
            },
        });

        if (error) {
            if (error.message.includes("already been registered")) {
                return NextResponse.json(
                    { error: "このメールアドレスは既に登録されています。" },
                    { status: 409 }
                );
            }
            return NextResponse.json(
                { error: "登録に失敗しました。" },
                { status: 500 }
            );
        }

        // profiles テーブルにレコードを作成
        if (data.user) {
            await supabaseAdmin.from("profiles").upsert({
                id: data.user.id,
                display_name: displayName,
                role: userType === "restaurant_owner" ? "shop_owner" : "user",
            });
        }

        // 店舗オーナーの場合、shops テーブルに初期レコードを作成
        if (userType === "restaurant_owner" && data.user) {
            await supabaseAdmin.from("shops").insert({
                owner_id: data.user.id,
                name: displayName,
                genre: "",
                address: "",
                latitude: 0,
                longitude: 0,
                status: "active",
            });
        }

        return NextResponse.json({ user: data.user });
    } catch {
        return NextResponse.json(
            { error: "登録に失敗しました。" },
            { status: 500 }
        );
    }
}
