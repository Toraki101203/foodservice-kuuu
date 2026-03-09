import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ShopDetailClient } from "./shop-detail-client";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ShopDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const [shopRes, postsRes, seatRes, followRes] = await Promise.all([
        supabase.from("shops").select("*").eq("id", id).single(),
        supabase
            .from("instagram_posts")
            .select("*")
            .eq("restaurant_id", id)
            .order("posted_at", { ascending: false })
            .limit(12),
        supabase.from("seat_status").select("*").eq("restaurant_id", id).single(),
        user
            ? supabase.from("follows").select("id").eq("user_id", user.id).eq("shop_id", id).maybeSingle()
            : Promise.resolve({ data: null }),
    ]);

    if (!shopRes.data) notFound();

    return (
        <ShopDetailClient
            shop={shopRes.data}
            posts={postsRes.data ?? []}
            seatStatus={seatRes.data}
            isFollowing={!!followRes.data}
            userId={user?.id ?? null}
        />
    );
}
