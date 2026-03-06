import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 全店取得
    const { data: shops, error: shopsError } = await supabase.from('shops').select('*');
    if (shopsError) console.error('shops取得エラー:', shopsError);

    // 全サブスク取得
    const { data: subscriptions, error: subsError } = await supabase.from('subscriptions').select('*');
    if (subsError) console.error('subscriptions取得エラー:', subsError);

    return NextResponse.json({
        currentUser: user,
        shops,
        subscriptions
    });
}
