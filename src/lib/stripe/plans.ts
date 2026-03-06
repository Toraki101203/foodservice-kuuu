export const PLANS = {
    free: {
        name: "無料プラン",
        price: 0,
        description: "掲載とInstagram連携のみ。まずはお試しに。",
        features: [
            "店舗掲載",
            "Instagram投稿URL登録（6件）",
            "基本情報の表示",
        ],
    },
    standard: {
        name: "スタンダードプラン",
        price: 9800,
        description: "空席リアルタイム更新と予約受付で集客を強化。",
        features: [
            "無料プランの全機能",
            "空席リアルタイム更新",
            "予約受付・管理",
            "基本アナリティクス",
        ],
    },
    premium: {
        name: "プレミアムプラン",
        price: 29800,
        description: "AI最適化と詳細分析で集客を最大化。",
        features: [
            "スタンダードプランの全機能",
            "AI投稿最適化提案",
            "詳細集客分析",
            "検索結果の優先表示",
        ],
    },
} as const;

export type PlanId = keyof typeof PLANS;
