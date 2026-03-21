import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ShopDetailClient } from "./shop-detail-client";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: shop }, { data: posts }, { data: auth }] = await Promise.all([
    supabase.from("shops").select("*, seat_status(*)").eq("id", id).single(),
    supabase
      .from("instagram_posts")
      .select("*")
      .eq("shop_id", id)
      .order("posted_at", { ascending: false })
      .limit(18),
    supabase.auth.getUser(),
  ]);

  if (!shop) notFound();

  let isFollowing = false;

  if (auth.user) {
    const { data: follow } = await supabase
      .from("follows")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("shop_id", id)
      .maybeSingle();
    isFollowing = !!follow;
  }

  return (
    <ShopDetailClient
      shop={shop}
      posts={posts ?? []}
      isFollowing={isFollowing}
      isLoggedIn={!!auth.user}
    />
  );
}
