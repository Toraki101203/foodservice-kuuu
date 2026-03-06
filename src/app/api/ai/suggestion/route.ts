import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!shop || shop.plan_type !== "premium") {
    return NextResponse.json(
      { error: "プレミアムプラン限定です" },
      { status: 403 }
    );
  }

  // 過去7日の分析データ
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: events } = await supabase
    .from("analytics_events")
    .select("event_type, created_at")
    .eq("restaurant_id", shop.id)
    .gte("created_at", sevenDaysAgo.toISOString());

  // Anthropic SDK を動的インポート（未インストール時の対応）
  try {
    const viewCount =
      events?.filter((e) => e.event_type === "view").length ?? 0;
    const clickCount =
      events?.filter((e) => e.event_type === "click").length ?? 0;
    const reserveCount =
      events?.filter((e) => e.event_type === "reserve").length ?? 0;
    const favoriteCount =
      events?.filter((e) => e.event_type === "favorite").length ?? 0;

    const prompt = `あなたは飲食店のInstagramマーケティングの専門家です。
以下の店舗データと直近7日間のアクセスデータを基に、今日のInstagram投稿の提案を1つ具体的にしてください。

店舗名: ${shop.name}
ジャンル: ${shop.genre || "不明"}
エリア: ${shop.address}

直近7日間のデータ:
- 閲覧数: ${viewCount}
- クリック数: ${clickCount}
- 予約数: ${reserveCount}
- お気に入り数: ${favoriteCount}

投稿提案には以下を含めてください:
1. 推奨投稿時間
2. 投稿テーマ・内容
3. キャプション例（ハッシュタグ付き）
4. 期待される効果

簡潔に300文字以内で回答してください。`;

    const mod = await import("@anthropic-ai/sdk");
    const AnthropicClient = mod.default;
    const anthropic = new AnthropicClient();

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const firstBlock = message.content[0];
    const suggestion = firstBlock.type === "text" ? firstBlock.text : "";
    return NextResponse.json({ suggestion });
  } catch {
    // Anthropic SDK が未インストール or API Key 未設定の場合
    return NextResponse.json({
      suggestion:
        "AI提案機能を利用するには、ANTHROPIC_API_KEY の設定と @anthropic-ai/sdk パッケージのインストールが必要です。",
      error: "API設定が必要です",
    });
  }
}
