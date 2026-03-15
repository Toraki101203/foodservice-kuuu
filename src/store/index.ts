import { create } from "zustand";
import type { Profile, Shop } from "@/types/database";

// --- 認証ストア ---

type AuthStore = {
  user: Profile | null;
  isLoading: boolean;
  setUser: (user: Profile | null) => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// --- 位置情報ストア ---

type LocationStore = {
  latitude: number | null;
  longitude: number | null;
  isLoading: boolean;
  error: string | null;
  setLocation: (lat: number, lng: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

export const useLocationStore = create<LocationStore>((set) => ({
  latitude: null,
  longitude: null,
  isLoading: true,
  error: null,
  setLocation: (latitude, longitude) =>
    set({ latitude, longitude, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
}));

// --- UI ストア ---

type UIStore = {
  isMenuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
};

export const useUIStore = create<UIStore>((set) => ({
  isMenuOpen: false,
  toggleMenu: () => set((s) => ({ isMenuOpen: !s.isMenuOpen })),
  closeMenu: () => set({ isMenuOpen: false }),
}));

// --- フォローストア ---

type FollowStore = {
  followingIds: Set<string>;
  setFollowingIds: (ids: Set<string>) => void;
  addFollow: (shopId: string) => void;
  removeFollow: (shopId: string) => void;
  isFollowing: (shopId: string) => boolean;
};

export const useFollowStore = create<FollowStore>((set, get) => ({
  followingIds: new Set(),
  setFollowingIds: (ids) => set({ followingIds: ids }),
  addFollow: (shopId) =>
    set((s) => ({ followingIds: new Set([...s.followingIds, shopId]) })),
  removeFollow: (shopId) =>
    set((s) => {
      const next = new Set(s.followingIds);
      next.delete(shopId);
      return { followingIds: next };
    }),
  isFollowing: (shopId) => get().followingIds.has(shopId),
}));

// --- 店舗オーナーストア ---

type ShopOwnerStore = {
  shop: Shop | null;
  setShop: (shop: Shop | null) => void;
};

export const useShopOwnerStore = create<ShopOwnerStore>((set) => ({
  shop: null,
  setShop: (shop) => set({ shop }),
}));
