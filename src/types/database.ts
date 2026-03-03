/**
 * ユーザータイプ
 */
export type UserType = "general" | "restaurant_owner";

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
 * 投稿タイプ
 */
export type PostType = "feed" | "story";

/**
 * 投稿
 */
export interface Post {
    id: string;
    user_id: string;
    restaurant_id: string | null;
    content: string;
    post_type: PostType;
    like_count: number;
    comment_count: number;
    created_at: string;
    image_url?: string | null;
    caption?: string | null;
    post_date?: string | null;
    // リレーション
    user?: User;
    restaurant?: Restaurant;
    images?: PostImage[];
}

/**
 * 投稿画像
 */
export interface PostImage {
    id: string;
    post_id: string;
    image_url: string;
    order: number;
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
 * フォロータイプ
 */
export type FollowingType = "user" | "restaurant";

/**
 * フォロー
 */
export interface Follow {
    id: string;
    follower_id: string;
    following_id: string;
    following_type: FollowingType;
    created_at: string;
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
 * コメント
 */
export interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    user?: User;
}

/**
 * いいね
 */
export interface PostLike {
    id: string;
    post_id: string;
    user_id: string;
    created_at: string;
}

/**
 * ストーリー（24時間限定投稿）
 */
export interface Story {
    id: string;
    shop_id: string;
    image_url: string;
    caption: string | null;
    expires_at: string;
    created_at: string;
    shop?: Restaurant;
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
    | "like"
    | "comment"
    | "follow"
    | "reservation_confirmed"
    | "reservation_cancelled"
    | "new_post";

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
            posts: { Row: Post };
            reservations: { Row: Reservation };
            favorites: { Row: Favorite };
            coupons: { Row: any };
            shop_courses: { Row: any };
            post_likes: { Row: PostLike };
            comments: { Row: Comment };
            follows: { Row: Follow };
            restaurant_images: { Row: RestaurantImage };
            menus: { Row: Menu };
            notifications: { Row: Notification };
            stories: { Row: Story };
        };
    };
}
