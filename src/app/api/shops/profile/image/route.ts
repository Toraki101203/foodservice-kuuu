import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export async function POST(request: Request) {
  // 認証チェック（anon key）
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const shopId = formData.get("shopId") as string | null;

  if (!file || !shopId) {
    return NextResponse.json(
      { error: "ファイルと店舗IDが必要です" },
      { status: 400 }
    );
  }

  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "ファイルサイズは5MB以下にしてください" },
      { status: 400 }
    );
  }

  // MIMEタイプ + 拡張子のホワイトリスト検証
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "画像形式はJPEG、PNG、WebPのみ対応しています" },
      { status: 400 }
    );
  }

  const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    return NextResponse.json(
      { error: "対応していないファイル拡張子です" },
      { status: 400 }
    );
  }

  // 店舗のオーナーであることを確認
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("owner_id", user.id)
    .single();

  if (!shop) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  // Service role クライアント（Storage RLS をバイパス）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 検証済み拡張子を使用
  const ext = fileExt;
  const filePath = `${shopId}/main.${ext}`;

  // ファイルを ArrayBuffer に変換
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Supabase Storage にアップロード（service role で RLS バイパス）
  const { error: uploadError } = await serviceSupabase.storage
    .from("shop-photos")
    .upload(filePath, buffer, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("[Profile Image] Upload error:", uploadError.message);
    return NextResponse.json(
      { error: `画像のアップロードに失敗しました: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // 公開URLを取得
  const {
    data: { publicUrl },
  } = serviceSupabase.storage.from("shop-photos").getPublicUrl(filePath);

  // shops テーブルの main_image を更新
  await serviceSupabase
    .from("shops")
    .update({ main_image: publicUrl })
    .eq("id", shopId);

  return NextResponse.json({ success: true, url: publicUrl });
}
