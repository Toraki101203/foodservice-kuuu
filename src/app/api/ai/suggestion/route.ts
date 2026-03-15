import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { shopId } = await request.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  // 所有権 + プレミアムプランチェック
  const { data: shop } = await supabase
    .from("shops")
    .select("*, subscriptions(*)")
    .eq("id", shopId)
    .eq("owner_id", user.id)
    .single();

  if (!shop || shop.plan_type !== "premium") {
    return NextResponse.json(
      { error: "プレミアムプランのみ利用可能です" },
      { status: 403 }
    );
  }

  // Get recent analytics and posts in parallel
  const [{ data: events }, { data: posts }] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("instagram_posts")
      .select("*")
      .eq("shop_id", shopId)
      .order("posted_at", { ascending: false })
      .limit(10),
  ]);

  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `あなたは飲食店の集客アドバイザーです。以下のデータを分析して、Instagram投稿の最適化提案を日本語で3つ提示してください。

店舗名: ${shop.name}
ジャンル: ${shop.genre || "未設定"}
直近の分析イベント: ${JSON.stringify(events?.slice(0, 20))}
直近のInstagram投稿: ${JSON.stringify(posts?.map((p: Record<string, unknown>) => ({ caption: p.caption, posted_at: p.posted_at })))}

各提案には以下を含めてください:
1. 提案タイトル
2. 具体的なアクション
3. 期待される効果`,
      },
    ],
  });

  const suggestion =
    message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ suggestion });
}
