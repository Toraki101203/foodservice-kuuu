import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: { shopId?: unknown; name?: unknown; genre?: unknown; description?: unknown; address?: unknown; phone?: unknown; budgetLunchMin?: unknown; budgetLunchMax?: unknown; budgetDinnerMin?: unknown; budgetDinnerMax?: unknown; businessHours?: unknown; mainImage?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  }

  const { shopId, name, genre, description, address, phone, budgetLunchMin, budgetLunchMax, budgetDinnerMin, budgetDinnerMax, businessHours, mainImage } = body;

  if (!shopId) {
    return NextResponse.json(
      { error: "店舗IDが必要です" },
      { status: 400 }
    );
  }

  // Service role クライアント（RLS バイパス：shops 読み取り・更新用）
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 店舗のオーナーであることを確認
  const { data: shop } = await serviceSupabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("owner_id", user.id)
    .single();

  if (!shop) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  // undefined のフィールドを除外して更新データを構築
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (genre !== undefined) updateData.genre = genre;
  if (description !== undefined) updateData.description = description;
  if (address !== undefined) updateData.address = address;
  if (phone !== undefined) updateData.phone = phone;
  if (budgetLunchMin !== undefined) updateData.budget_lunch_min = budgetLunchMin;
  if (budgetLunchMax !== undefined) updateData.budget_lunch_max = budgetLunchMax;
  if (budgetDinnerMin !== undefined) updateData.budget_dinner_min = budgetDinnerMin;
  if (budgetDinnerMax !== undefined) updateData.budget_dinner_max = budgetDinnerMax;
  if (businessHours !== undefined) updateData.business_hours = typeof businessHours === "string" ? businessHours : JSON.stringify(businessHours);
  if (mainImage !== undefined) updateData.main_image = mainImage;

  const { data, error } = await serviceSupabase
    .from("shops")
    .update(updateData)
    .eq("id", shopId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "プロフィールの更新に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, shop: data });
}
