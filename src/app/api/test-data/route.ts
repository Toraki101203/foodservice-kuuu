import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: users, error: userError } = await supabase.from('profiles').select('id').limit(1);
        if (userError || !users || users.length === 0) {
            return NextResponse.json({ error: 'No users found to act as shop owner' }, { status: 500 });
        }

        const ownerId = users[0].id;

        // DBがUUID形式を要求するため、固定IDではなく完全なダミーUUIDを用意
        // なお、削除時に特定しやすいように prefix 込みで探すか、
        // 今回は特定の dummy UUID 文字列を使うことで識別する
        const dummyShopId1 = "11111111-1111-1111-1111-111111111111";
        const dummyShopId2 = "22222222-2222-2222-2222-222222222222";
        const dummyShopId3 = "33333333-3333-3333-3333-333333333333";
        const dummyPostId1 = "11111111-0000-1111-0000-111111111111";
        const dummyPostId2 = "22222222-0000-2222-0000-222222222222";
        const dummyPostId3 = "33333333-0000-3333-0000-333333333333";

        // 古いダミーデータを削除
        await supabase.from('posts').delete().in('id', [dummyPostId1, dummyPostId2, dummyPostId3]);
        await supabase.from('shops').delete().in('id', [dummyShopId1, dummyShopId2, dummyShopId3]);

        const shops = [
            {
                id: dummyShopId1,
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
                id: dummyShopId2,
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
                id: dummyShopId3,
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

        const today = new Date().toISOString().split("T")[0];
        const posts = [
            {
                id: dummyPostId1,
                shop_id: dummyShopId1,
                image_url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80",
                caption: "本日のケーキセット焼き上がりました！☕️ テストデータです。",
                post_date: today,
            },
            {
                id: dummyPostId2,
                shop_id: dummyShopId2,
                image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80",
                caption: "本日も17時からオープンします！美味しいパスタをご用意してます🍝 テストデータです。",
                post_date: today,
            },
            {
                id: dummyPostId3,
                shop_id: dummyShopId3,
                image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80",
                caption: "上カルビ入荷しました！今なら個室空いてます🥩 テストデータです。",
                post_date: today,
            }
        ];

        const { error: shopErr } = await supabase.from('shops').insert(shops);
        if (shopErr) throw new Error("Shops Error: " + shopErr.message);

        const { error: postErr } = await supabase.from('posts').insert(posts);
        if (postErr) throw new Error("Posts Error: " + postErr.message);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const dummyShopId1 = "11111111-1111-1111-1111-111111111111";
        const dummyShopId2 = "22222222-2222-2222-2222-222222222222";
        const dummyShopId3 = "33333333-3333-3333-3333-333333333333";
        const dummyPostId1 = "11111111-0000-1111-0000-111111111111";
        const dummyPostId2 = "22222222-0000-2222-0000-222222222222";
        const dummyPostId3 = "33333333-0000-3333-0000-333333333333";

        await supabase.from('posts').delete().in('id', [dummyPostId1, dummyPostId2, dummyPostId3]);
        await supabase.from('shops').delete().in('id', [dummyShopId1, dummyShopId2, dummyShopId3]);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
