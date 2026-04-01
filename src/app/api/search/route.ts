import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "検索クエリが必要です" },
      { status: 400 }
    );
  }

  // PostgREST の特殊文字をエスケープ（カンマ、括弧、ピリオド）
  const sanitized = query.trim().replace(/[,().\\%_]/g, "");
  if (sanitized.length === 0) {
    return NextResponse.json({ shops: [] });
  }

  const searchTerm = `%${sanitized}%`;

  const { data, error } = await supabase
    .from("shops")
    .select("*, seat_status(*)")
    .or(`name.ilike.${searchTerm},genre.ilike.${searchTerm},address.ilike.${searchTerm}`)
    .limit(30);

  if (error) {
    return NextResponse.json(
      { error: "検索に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ shops: data });
}
