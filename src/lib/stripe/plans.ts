import type { PlanType } from "@/types/database";

export type PlanInfo = {
  id: PlanType;
  name: string;
  price: number;
  priceId: string | null;
  features: string[];
};

export const PLANS: Record<PlanType, PlanInfo> = {
  free: {
    id: "free",
    name: "無料プラン",
    price: 0,
    priceId: null,
    features: ["店舗掲載", "Instagram URL登録（6件）"],
  },
  standard: {
    id: "standard",
    name: "スタンダード",
    price: 9800,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID ?? "",
    features: [
      "無料プランの全機能",
      "空席リアルタイム更新",
      "予約受付",
      "基本分析",
    ],
  },
  premium: {
    id: "premium",
    name: "プレミアム",
    price: 29800,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID ?? "",
    features: [
      "スタンダードの全機能",
      "AI投稿最適化提案",
      "詳細分析",
      "検索結果で優先表示",
    ],
  },
};
