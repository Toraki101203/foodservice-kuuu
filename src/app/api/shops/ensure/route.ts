import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * 店舗レコードの確保 API
 * 店舗オーナーなのに shops レコードがない場合に自動作成する
 */
export async function POST() {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "未認証" }, { status: 401 });
        }

        // service_role で操作（RLS バイパス）
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 既存の店舗を確認
        const { data: existing } = await supabaseAdmin
            .from("shops")
            .select("*")
            .eq("owner_id", user.id)
            .limit(1)
            .single();

        if (existing) {
            return NextResponse.json({ shop: existing });
        }

        // 新規作成
        const displayName = user.user_metadata?.display_name || "マイ店舗";
        const { data: newShop, error } = await supabaseAdmin
            .from("shops")
            .insert({
                owner_id: user.id,
                name: displayName,
                genre: "",
                address: "",
                latitude: 0,
                longitude: 0,
                status: "active",
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: "店舗作成に失敗しました" }, { status: 500 });
        }

        return NextResponse.json({ shop: newShop });
    } catch {
        return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
    }
}
