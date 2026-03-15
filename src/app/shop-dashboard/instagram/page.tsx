import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InstagramClient } from "./instagram-client";

export default async function InstagramPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, instagram_username, instagram_access_token, instagram_synced_at, instagram_url")
    .eq("owner_id", user.id)
    .single();

  if (!shop) redirect("/");

  const isConnected = Boolean(shop.instagram_access_token);

  const { data: posts } = await supabase
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
