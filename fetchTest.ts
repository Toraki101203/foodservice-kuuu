import { createClient } from "@supabase/supabase-js";

async function run() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];

    // First let's check if the posts even exist for 'today'
    const resRaw = await supabase.from('posts').select('*').eq('post_date', today);
    console.log("Raw posts count for today:", resRaw.data?.length);

    // Now check the exact query from page.tsx
    const res1 = await supabase
        .from("posts")
        .select(`
        *,
        shop:shops!inner(*),
        coupon:coupons(*)
      `)
        .eq("post_date", today)
        .eq("shop.status", "active");

    console.log("Query from page.tsx: Error:", res1.error?.message, " | Posts length:", res1.data?.length);

    // Test alias fix if it failed
    if (res1.error || res1.data?.length === 0) {
        const res2 = await supabase
            .from("posts")
            .select(`*, shops!inner(*), coupon:coupons(*)`)
            .eq("post_date", today)
            .eq("shops.status", "active");
        console.log("Query with 'shops' not 'shop' alias: Error:", res2.error?.message, " | Posts length:", res2.data?.length);
    }
}

run();
