import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();

    // 全店取得
    const { data: shops } = await supabase.from('shops').select('*');

    // 全サブスク取得
    const { data: subscriptions } = await supabase.from('subscriptions').select('*');

    // 現在のユーザー取得
    const { data: { user } } = await supabase.auth.getUser();

    return NextResponse.json({
        currentUser: user,
        shops,
        subscriptions
    });
}
