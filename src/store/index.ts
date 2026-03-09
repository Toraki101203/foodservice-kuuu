import { create } from "zustand";
import type { User, Restaurant } from "@/types";

/**
 * 認証状態ストア
 */
interface AuthState {
    user: User | null;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
    user: null,
    isLoading: true,
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ isLoading: loading }),
}));

/**
 * 店舗オーナー用ストア
 */
interface RestaurantOwnerState {
    restaurant: Restaurant | null;
    setRestaurant: (restaurant: Restaurant | null) => void;
}

export const useRestaurantOwnerStore = create<RestaurantOwnerState>()((set) => ({
    restaurant: null,
    setRestaurant: (restaurant) => set({ restaurant }),
}));

/**
 * 位置情報ストア
 */
interface LocationState {
    latitude: number | null;
    longitude: number | null;
    isLoading: boolean;
    error: string | null;
    setLocation: (lat: number, lng: number) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useLocationStore = create<LocationState>()((set) => ({
    latitude: null,
    longitude: null,
    isLoading: false,
    error: null,
    setLocation: (latitude, longitude) =>
        set({ latitude, longitude, error: null }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
}));

/**
 * UIストア（モーダル、トーストなど）
 */
interface UIState {
    isMenuOpen: boolean;
    toggleMenu: () => void;
    closeMenu: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
    isMenuOpen: false,
    toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
    closeMenu: () => set({ isMenuOpen: false }),
}));

/**
 * フォローストア
 */
interface FollowState {
    followingIds: Set<string>;
    setFollowingIds: (ids: string[]) => void;
    addFollow: (shopId: string) => void;
    removeFollow: (shopId: string) => void;
    isFollowing: (shopId: string) => boolean;
}

export const useFollowStore = create<FollowState>()((set, get) => ({
    followingIds: new Set<string>(),
    setFollowingIds: (ids) => set({ followingIds: new Set(ids) }),
    addFollow: (shopId) =>
        set((state) => {
            const next = new Set(state.followingIds);
            next.add(shopId);
            return { followingIds: next };
        }),
    removeFollow: (shopId) =>
        set((state) => {
            const next = new Set(state.followingIds);
            next.delete(shopId);
            return { followingIds: next };
        }),
    isFollowing: (shopId) => get().followingIds.has(shopId),
}));
