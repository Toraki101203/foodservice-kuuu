import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  // レート制限: 10回/時（API料金保護）
  const { allowed } = checkRateLimit(`ai:${user.id}`, { maxRequests: 10, windowMs: 3_600_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "AI提案のリクエスト上限に達しました。1時間後に再度お試しください。" },
      { status: 429 }
    );
  }

  let body: { shopId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }
  const { shopId } = body;

  // Service role クライアント（RLS バイパス：shops/subscriptions/instagram_posts 読み取り用）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 所有権 + プレミアムプランチェック
  const { data: shop } = await serviceSupabase
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
    serviceSupabase
      .from("analytics_events")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(100),
    serviceSupabase
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
    system: "あなたは飲食店の集客アドバイザーです。ユーザーから提供されるデータを分析して、Instagram投稿の最適化提案を日本語で3つ提示してください。各提案には提案タイトル、具体的なアクション、期待される効果を含めてください。",
    messages: [
      {
        role: "user",
        content: `以下のデータを分析してください。

店舗名: ${JSON.stringify(shop.name)}
ジャンル: ${JSON.stringify(shop.genre || "未設定")}
直近の分析イベント: ${JSON.stringify(events?.slice(0, 20))}
直近のInstagram投稿: ${JSON.stringify(posts?.map((p: Record<string, unknown>) => ({ caption: p.caption, posted_at: p.posted_at })))}`,
      },
    ],
  });

  const suggestion =
    message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ suggestion });
}
