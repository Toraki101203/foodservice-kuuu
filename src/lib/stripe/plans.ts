// NOW 料金プラン定義
export const PLANS = {
    starter: {
        name: "スタータープラン",
        price: 19800,
        description: "基本機能をすべて利用可能。初めてのお店におすすめ。",
        features: [
            "今日の1枚を毎日投稿",
            "予約受付・管理",
            "クーポン発行",
            "基本アナリティクス",
        ],
    },
    premium: {
        name: "プレミアムプラン",
        price: 29800,
        description: "優先表示・分析強化。集客を最大化したいお店に。",
        features: [
            "スタータープランの全機能",
            "タイムライン優先表示",
            "詳細アナリティクス",
            "複数写真投稿",
            "優先サポート",
        ],
    },
} as const;

export type PlanId = keyof typeof PLANS;
