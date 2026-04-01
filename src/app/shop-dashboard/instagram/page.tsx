import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { InstagramClient } from "./instagram-client";

export default async function InstagramPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // service role で取得（RLS が access_token カラムをブロックする場合に対応）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: shop } = await serviceSupabase
    .from("shops")
    .select("id, name, instagram_username, instagram_user_id, instagram_access_token, instagram_synced_at, instagram_url")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!shop) redirect("/");

  const isConnected = Boolean(shop.instagram_access_token);

  const { data: posts } = await serviceSupabase
    .from("instagram_posts")
    .select("*")
    .eq("shop_id", shop.id)
    .order("posted_at", { ascending: false });

  return (
    <InstagramClient
      shopId={shop.id}
      isConnected={isConnected}
      instagramUsername={shop.instagram_username}
      instagramUrl={shop.instagram_url}
      lastSyncedAt={shop.instagram_synced_at}
      initialPosts={posts ?? []}
    />
  );
}
