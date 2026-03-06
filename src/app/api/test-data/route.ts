import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const DUMMY_SHOP_IDS = [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
    "33333333-3333-3333-3333-333333333333",
] as const;

function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

function requireDevelopment() {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "開発環境でのみ使用可能です" }, { status: 403 });
    }
    return null;
}

export async function POST(request: Request) {
    const guard = requireDevelopment();
    if (guard) return guard;

    try {
        const supabase = createAdminClient();

        const { data: users, error: userError } = await supabase.from('profiles').select('id').limit(1);
        if (userError || !users || users.length === 0) {
            return NextResponse.json({ error: 'No users found to act as shop owner' }, { status: 500 });
        }

        const ownerId = users[0].id;

        // 古いダミーデータを削除
        await supabase.from('shops').delete().in('id', [...DUMMY_SHOP_IDS]);

        const shops = [
            {
                id: DUMMY_SHOP_IDS[0],
                owner_id: ownerId,
                name: "【テスト】NOW カフェ天神",
                genre: "カフェ",
                price_range: "￥1,000〜",
                description: "MAP機能テスト用のカフェです。",
                address: "福岡県福岡市中央区天神1-1-1",
                latitude: 33.5902,
                longitude: 130.3991,
                status: "active" as const,
                atmosphere_photos: ["https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&q=80"]
            },
            {
                id: DUMMY_SHOP_IDS[1],
                owner_id: ownerId,
                name: "【テスト】イタリアンバル NOW",
                genre: "イタリアン",
                price_range: "￥4,000〜",
                description: "MAP機能テスト用のイタリアンバルです。",
                address: "福岡県福岡市中央区大名1-1-1",
                latitude: 33.5878,
                longitude: 130.3955,
                status: "active" as const,
                atmosphere_photos: ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80"]
            },
            {
                id: DUMMY_SHOP_IDS[2],
                owner_id: ownerId,
                name: "【テスト】焼肉 NOW 赤坂店",
                genre: "焼肉",
                price_range: "￥5,000〜",
                description: "MAP機能テスト用の焼肉店です。",
                address: "福岡県福岡市中央区赤坂1-1-1",
                latitude: 33.5885,
                longitude: 130.3892,
                status: "active" as const,
                atmosphere_photos: ["https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80"]
            }
        ];

        const { error: shopErr } = await supabase.from('shops').insert(shops);
        if (shopErr) throw new Error("Shops Error: " + shopErr.message);

        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const guard = requireDevelopment();
    if (guard) return guard;

    try {
        const supabase = createAdminClient();

        await supabase.from('shops').delete().in('id', [...DUMMY_SHOP_IDS]);

        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
