/**
 * ユーザータイプ
 */
export type UserType = "general" | "restaurant_owner" | "partner";

/**
 * ユーザー
 */
export interface User {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    user_type: UserType;
    created_at: string;
}

/**
 * プランタイプ
 */
export type PlanType = "free" | "standard" | "premium";

/**
 * 店舗
 */
export interface Restaurant {
    id: string;
    owner_id: string;
    name: string;
    description: string | null;
    address: string;
    latitude: number;
    longitude: number;
    phone: string | null;
    business_hours: BusinessHours | null;
    categories: string[];
    genre: string;
    plan_type: PlanType;
    is_verified: boolean;
    is_open: boolean;
    status?: string | null;
    atmosphere_photos?: string[] | null;
    price_range?: string | null;
    closed_days?: string | null;
    instagram_url?: string | null;
    instagram_username?: string | null;
    instagram_access_token?: string | null;
    instagram_token_expires_at?: string | null;
    instagram_user_id?: string | null;
    instagram_synced_at?: string | null;
    created_at: string;
}

/**
 * 営業時間
 */
export interface BusinessHours {
    monday?: DayHours;
    tuesday?: DayHours;
    wednesday?: DayHours;
    thursday?: DayHours;
    friday?: DayHours;
    saturday?: DayHours;
    sunday?: DayHours;
}

export interface DayHours {
    open: string;
    close: string;
    is_closed?: boolean;
}

/**
 * 席状況ステータス
 */
export type SeatStatusType = "available" | "busy" | "full" | "closed";

/**
 * 席状況
 */
export interface SeatStatus {
    id: string;
    restaurant_id: string;
    status: SeatStatusType;
    available_seats: number | null;
    wait_time_minutes: number | null;
    updated_at: string;
}

/**
 * 予約ステータス
 */
export type ReservationStatus =
    | "pending"
    | "confirmed"
    | "cancelled"
    | "completed";

/**
 * 予約
 */
export interface Reservation {
    id: string;
    user_id: string;
    restaurant_id: string;
    reservation_datetime: string;
    party_size: number;
    note: string | null;
    status: ReservationStatus;
    created_at: string;
    reservation_date?: string | null;
    reservation_time?: string | null;
    shop_id?: string | null;
    // リレーション
    user?: User;
    restaurant?: Restaurant;
}

/**
 * お気に入り
 */
export interface Favorite {
    id: string;
    user_id: string;
    restaurant_id: string;
    created_at: string;
}

/**
 * Instagram投稿キャッシュ
 */
export interface InstagramPost {
    id: string;
    restaurant_id: string;
    instagram_post_id: string | null;
    image_url: string;
    caption: string | null;
    permalink: string;
    posted_at: string | null;
    fetched_at: string;
    created_at: string;
}

/**
 * 営業パートナー
 */
export interface Partner {
    id: string;
    user_id: string;
    referral_code: string;
    created_at: string;
}

/**
 * パートナー紹介実績
 */
export interface PartnerReferral {
    id: string;
    partner_id: string;
    restaurant_id: string;
    plan_type: string;
    contracted_at: string;
    is_active: boolean;
    created_at: string;
    restaurant?: Restaurant;
}

/**
 * 振込ステータス
 */
export type PayoutStatus = "pending" | "paid";

/**
 * パートナー振込
 */
export interface PartnerPayout {
    id: string;
    partner_id: string;
    amount: number;
    period_start: string;
    period_end: string;
    status: PayoutStatus;
    paid_at: string | null;
    created_at: string;
}

/**
 * 分析イベントタイプ
 */
export type AnalyticsEventType = "view" | "click" | "reserve" | "favorite";

/**
 * 集客分析イベント
 */
export interface AnalyticsEvent {
    id: string;
    restaurant_id: string;
    event_type: AnalyticsEventType;
    user_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
}

/**
 * 店舗画像
 */
export interface RestaurantImage {
    id: string;
    restaurant_id: string;
    image_url: string;
    is_primary: boolean;
    order: number;
}

/**
 * メニュー
 */
export interface Menu {
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category: string | null;
    is_available: boolean;
}

/**
 * 通知タイプ
 */
export type NotificationType =
    | "reservation_confirmed"
    | "reservation_cancelled"
    | "new_instagram_post";

/**
 * 通知
 */
export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    data: Record<string, unknown> | null;
    is_read: boolean;
    created_at: string;
}

/**
 * 互換性のための Supabase Database Wrapper
 */
export interface Database {
    public: {
        Tables: {
            shops: { Row: Restaurant };
            profiles: { Row: User };
            reservations: { Row: Reservation };
            favorites: { Row: Favorite };
            instagram_posts: { Row: InstagramPost };
            partners: { Row: Partner };
            partner_referrals: { Row: PartnerReferral };
            partner_payouts: { Row: PartnerPayout };
            analytics_events: { Row: AnalyticsEvent };
            restaurant_images: { Row: RestaurantImage };
            menus: { Row: Menu };
            notifications: { Row: Notification };
        };
    };
}
