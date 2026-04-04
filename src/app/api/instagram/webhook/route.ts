import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncShopStories } from "@/lib/instagram-sync";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  // HMAC 署名検証
  const signature = request.headers.get("x-hub-signature-256");
  if (!signature) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const expectedSig =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(body).digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 署名検証通過 — Webhook イベント処理
  try {
    const payload = JSON.parse(body);

    // Instagram Webhook のエントリを処理
    if (payload.entry && Array.isArray(payload.entry)) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      for (const entry of payload.entry) {
        const instagramUserId = entry.id;

        // ストーリー関連の変更を検出
        const hasStoryChange = entry.changes?.some(
          (c: { field: string }) => c.field === "stories" || c.field === "story_insights"
        );

        if (hasStoryChange && instagramUserId) {
          // instagram_user_id から店舗を特定
          const { data: shop } = await supabase
            .from("shops")
            .select("*")
            .eq("instagram_user_id", instagramUserId)
            .maybeSingle();

          if (shop) {
            // 非同期でストーリー同期（Webhook レスポンスをブロックしない）
            syncShopStories(supabase, shop).catch((err) => {
              console.error("[Webhook] Story sync failed:", err);
            });
          }
        }
      }
    }
  } catch {
    // Webhook イベントの処理失敗は受理自体に影響させない
    console.error("[Webhook] Event processing error");
  }

  return NextResponse.json({ received: true });
}
