import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PostDetailClient } from "./post-detail-client";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string; postId: string }>;
}) {
  const { id, postId } = await params;
  const supabase = await createClient();

  const [{ data: post }, { data: shop }, { data: auth }] = await Promise.all([
    supabase
      .from("instagram_posts")
      .select("*")
      .eq("id", postId)
      .eq("shop_id", id)
      .single(),
    supabase.from("shops").select("name, main_image").eq("id", id).single(),
    supabase.auth.getUser(),
  ]);

  if (!post || !shop) notFound();

  let isSaved = false;
  if (auth.user) {
    const { data: fav } = await supabase
      .from("post_favorites")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("post_id", postId)
      .maybeSingle();
    isSaved = !!fav;
  }

  return (
    <PostDetailClient
      post={post}
      shop={shop}
      shopId={id}
      isSaved={isSaved}
      isLoggedIn={!!auth.user}
    />
  );
}
