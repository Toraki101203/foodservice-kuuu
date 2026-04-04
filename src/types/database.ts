// ============================================================
// モグリス — データベース型定義
// Supabase スキーマに完全一致する TypeScript 型
// ============================================================

// --- ENUM 型 ---

export type UserType = "user" | "shop_owner" | "admin";

export type PlanType = "free" | "standard" | "premium";

export type SeatStatusType = "available" | "busy" | "full" | "closed";

export type ReservationStatus =
  | "on_the_way"
  | "arrived"
  | "no_show"
  | "cancelled";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export type NotificationType =
  | "follow"
  | "new_post"
  | "new_instagram_post"
  | "instant_visit"
  | "visit_arrived";

export type AnalyticsEventType =
  | "view"
  | "click"
  | "reserve"
  | "favorite"
  | "share"
  | "instagram_click"
  | "post_view"
  | "post_impression";

export type MediaType = "IMAGE" | "VIDEO";

// --- 営業時間 ---

export type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

export type BusinessHours = {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
};

// --- テーブル型 ---

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserType;
  created_at: string;
};

export type Shop = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  business_hours: BusinessHours | null;
  genre: string | null;
  budget_lunch_min: number | null;
  budget_lunch_max: number | null;
  budget_dinner_min: number | null;
  budget_dinner_max: number | null;
  main_image: string | null;
  plan_type: PlanType;
  is_verified: boolean;
  instagram_url: string | null;
  instagram_username: string | null;
  instagram_access_token: string | null;
  instagram_token_expires_at: string | null;
  instagram_user_id: string | null;
  instagram_synced_at: string | null;
  stories_synced_at: string | null;
  created_at: string;
};

export type SeatStatus = {
  id: string;
  shop_id: string;
  status: SeatStatusType;
  available_seats: number | null;
  wait_time_minutes: number | null;
  updated_at: string;
};

export type Follow = {
  id: string;
  user_id: string;
  shop_id: string;
  created_at: string;
};

export type PostFavorite = {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
};

export type Reservation = {
  id: string;
  user_id: string;
  shop_id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  note: string | null;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
};

export type InstagramPost = {
  id: string;
  shop_id: string;
  instagram_post_id: string;
  image_url: string | null;
  caption: string | null;
  permalink: string | null;
  posted_at: string | null;
  fetched_at: string;
  created_at: string;
};

export type InstagramStory = {
  id: string;
  shop_id: string;
  instagram_media_id: string;
  media_url: string;
  media_type: MediaType;
  timestamp: string | null;
  expires_at: string;
  fetched_at: string;
};

export type Subscription = {
  id: string;
  shop_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  plan_type: PlanType;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

export type AnalyticsEvent = {
  id: string;
  shop_id: string;
  event_type: AnalyticsEventType;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type Partner = {
  id: string;
  user_id: string;
  referral_code: string;
  created_at: string;
};

export type PartnerReferral = {
  id: string;
  partner_id: string;
  shop_id: string;
  plan_type: PlanType | null;
  contracted_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type PartnerPayout = {
  id: string;
  partner_id: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: "pending" | "paid";
  paid_at: string | null;
  created_at: string;
};

// --- Supabase Database 型マッピング ---

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      shops: {
        Row: Shop;
        Insert: Partial<Shop> & { owner_id: string; name: string };
        Update: Partial<Shop>;
      };
      seat_status: {
        Row: SeatStatus;
        Insert: Partial<SeatStatus> & { shop_id: string };
        Update: Partial<SeatStatus>;
      };
      follows: {
        Row: Follow;
        Insert: { user_id: string; shop_id: string };
        Update: Partial<Follow>;
      };
      post_favorites: {
        Row: PostFavorite;
        Insert: { user_id: string; post_id: string };
        Update: Partial<PostFavorite>;
      };
      reservations: {
        Row: Reservation;
        Insert: Partial<Reservation> & {
          user_id: string;
          shop_id: string;
          party_size: number;
        };
        Update: Partial<Reservation>;
      };
      instagram_posts: {
        Row: InstagramPost;
        Insert: Partial<InstagramPost> & {
          shop_id: string;
          instagram_post_id: string;
        };
        Update: Partial<InstagramPost>;
      };
      instagram_stories: {
        Row: InstagramStory;
        Insert: Partial<InstagramStory> & {
          shop_id: string;
          instagram_media_id: string;
          media_url: string;
          expires_at: string;
        };
        Update: Partial<InstagramStory>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Partial<Subscription> & { shop_id: string };
        Update: Partial<Subscription>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & {
          user_id: string;
          type: NotificationType;
          title: string;
        };
        Update: Partial<Notification>;
      };
      analytics_events: {
        Row: AnalyticsEvent;
        Insert: Partial<AnalyticsEvent> & {
          shop_id: string;
          event_type: AnalyticsEventType;
        };
        Update: Partial<AnalyticsEvent>;
      };
      partners: {
        Row: Partner;
        Insert: { user_id: string; referral_code: string };
        Update: Partial<Partner>;
      };
      partner_referrals: {
        Row: PartnerReferral;
        Insert: Partial<PartnerReferral> & {
          partner_id: string;
          shop_id: string;
        };
        Update: Partial<PartnerReferral>;
      };
      partner_payouts: {
        Row: PartnerPayout;
        Insert: Partial<PartnerPayout> & {
          partner_id: string;
          amount: number;
          period_start: string;
          period_end: string;
        };
        Update: Partial<PartnerPayout>;
      };
    };
  };
};
