"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search as SearchIcon, MapPin, Store, ChevronRight, ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/database";
import { REGIONS } from "@/data/prefectures";

type Shop = Database["public"]["Tables"]["shops"]["Row"];

const GENRES = ["すべて", "居酒屋", "焼肉・ホルモン", "和食", "イタリアン", "フレンチ", "中華", "カフェ", "バー"];

type AreaStep = "region" | "prefecture" | "city";

export default function SearchPage() {
    const supabase = createClient();
    const [keyword, setKeyword] = useState("");
    const [selectedGenre, setSelectedGenre] = useState("すべて");
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // エリア選択の状態
    const [areaStep, setAreaStep] = useState<AreaStep>("region");
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(null);
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    // ユーザーが明示的に検索を確定したエリア
    const [confirmedAreaQuery, setConfirmedAreaQuery] = useState<string | null>(null);

    useEffect(() => {
        if (!keyword && !confirmedAreaQuery) {
            setShops([]);
            setHasSearched(false);
            return;
        }

        const fetchShops = async () => {
            setLoading(true);
            setHasSearched(true);
            let query = supabase.from("shops").select("*").eq("status", "active");

            if (selectedGenre !== "すべて") {
                query = query.eq("genre", selectedGenre);
            }

            const searchTerm = keyword || confirmedAreaQuery;
            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
            }

            const { data } = await query.order("created_at", { ascending: false }).limit(30);
            setShops(data || []);
            setLoading(false);
        };

        const timeoutId = setTimeout(fetchShops, 400);
        return () => clearTimeout(timeoutId);
    }, [keyword, selectedGenre, confirmedAreaQuery, supabase]);

    const handleRegionClick = (regionName: string) => {
        setSelectedRegion(regionName);
        setAreaStep("prefecture");
    };

    const handlePrefectureClick = (prefName: string) => {
        setSelectedPrefecture(prefName);
        setSelectedCity(null);
        setAreaStep("city");
        // 都道府県を選んだだけでは検索しない → 市区町村画面へ進む
    };

    const handleCityClick = (cityName: string) => {
        setSelectedCity(cityName);
        setConfirmedAreaQuery(cityName);
        setKeyword("");
    };

    const handlePrefectureWideSearch = () => {
        setSelectedCity(null);
        setConfirmedAreaQuery(selectedPrefecture);
        setKeyword("");
    };

    const handleBackToRegion = () => {
        setAreaStep("region");
        setSelectedRegion(null);
        setSelectedPrefecture(null);
        setSelectedCity(null);
    };

    const handleBackToPrefecture = () => {
        setAreaStep("prefecture");
        setSelectedCity(null);
    };

    const clearAreaSelection = () => {
        setSelectedRegion(null);
        setSelectedPrefecture(null);
        setSelectedCity(null);
        setConfirmedAreaQuery(null);
        setAreaStep("region");
    };

    const currentRegion = REGIONS.find(r => r.name === selectedRegion);
    const currentPrefecture = currentRegion?.prefectures.find(p => p.name === selectedPrefecture);

    // 検索バーに表示するテキスト
    const areaLabel = selectedCity
        ? `${selectedPrefecture} ${selectedCity}`
        : selectedPrefecture
            ? selectedPrefecture
            : "";

    return (
        <div className="mx-auto flex max-w-lg flex-col px-4 py-6">
            <h1 className="mb-1 text-2xl font-bold text-gray-800">
                お店を探す
            </h1>
            <p className="mb-5 text-xs text-gray-400">
                全国のお店をエリアやジャンルから検索
            </p>

            {/* 検索バー */}
            <div className="relative mb-4">
                <SearchIcon className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={confirmedAreaQuery ? "" : keyword}
                    onChange={(e) => {
                        setKeyword(e.target.value);
                        if (e.target.value) clearAreaSelection();
                    }}
                    placeholder={confirmedAreaQuery ? "" : "店名・エリア・駅名で検索..."}
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-gray-700 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
            </div>

            {/* 選択中のエリア表示 */}
            {confirmedAreaQuery && (
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-600">
                        <MapPin className="size-3.5" />
                        {areaLabel}
                        <button onClick={clearAreaSelection} className="ml-1 rounded-full p-0.5 hover:bg-orange-100" aria-label="エリア選択をクリア">
                            <X className="size-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* ジャンルフィルター */}
            <div className="mb-5 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex gap-2">
                    {GENRES.map((genre) => (
                        <button
                            key={genre}
                            onClick={() => setSelectedGenre(genre)}
                            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${selectedGenre === genre
                                ? "bg-orange-500 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            {genre}
                        </button>
                    ))}
                </div>
            </div>

            {/* エリア選択 / 検索結果 */}
            {!hasSearched ? (
                <div>
                    {/* ステップ: 地方選択 */}
                    {areaStep === "region" && (
                        <div>
                            <h2 className="mb-3 text-sm font-bold text-gray-500">
                                エリアから探す
                            </h2>
                            <div className="flex flex-col gap-1">
                                {REGIONS.map((region) => (
                                    <button
                                        key={region.name}
                                        onClick={() => handleRegionClick(region.name)}
                                        className="flex min-h-[44px] items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-gray-50"
                                    >
                                        <span className="text-sm font-bold text-gray-700">{region.name}</span>
                                        <span className="flex items-center gap-1 text-xs text-gray-400">
                                            {region.prefectures.length}県
                                            <ChevronRight className="size-4" />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ステップ: 都道府県選択 */}
                    {areaStep === "prefecture" && currentRegion && (
                        <div>
                            <button
                                onClick={handleBackToRegion}
                                className="mb-3 flex items-center gap-1 text-sm font-bold text-orange-500 hover:text-orange-600"
                            >
                                <ChevronLeft className="size-4" />
                                地方を選び直す
                            </button>
                            <h2 className="mb-3 text-sm font-bold text-gray-500">
                                {currentRegion.name}
                            </h2>
                            <div className="grid grid-cols-3 gap-2">
                                {currentRegion.prefectures.map((pref) => (
                                    <button
                                        key={pref.name}
                                        onClick={() => handlePrefectureClick(pref.name)}
                                        className={`flex min-h-[44px] items-center justify-center rounded-xl text-sm font-bold transition-colors ${selectedPrefecture === pref.name
                                            ? "bg-orange-500 text-white"
                                            : "bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-500"
                                            }`}
                                    >
                                        {pref.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ステップ: 市区町村選択 */}
                    {areaStep === "city" && currentPrefecture && (
                        <div>
                            <button
                                onClick={handleBackToPrefecture}
                                className="mb-3 flex items-center gap-1 text-sm font-bold text-orange-500 hover:text-orange-600"
                            >
                                <ChevronLeft className="size-4" />
                                {selectedRegion}に戻る
                            </button>
                            <h2 className="mb-3 text-sm font-bold text-gray-500">
                                {currentPrefecture.name}
                            </h2>
                            <div className="grid grid-cols-3 gap-2">
                                {/* 都道府県全体ボタン */}
                                <button
                                    onClick={handlePrefectureWideSearch}
                                    className={`flex min-h-[44px] items-center justify-center rounded-xl text-sm font-bold transition-colors col-span-3 ${!selectedCity
                                        ? "bg-orange-500 text-white"
                                        : "bg-orange-50 text-orange-500 hover:bg-orange-100"
                                        }`}
                                >
                                    {currentPrefecture.name}全域で検索
                                </button>
                                {currentPrefecture.cities.map((city) => (
                                    <button
                                        key={city}
                                        onClick={() => handleCityClick(city)}
                                        className={`flex min-h-[44px] items-center justify-center rounded-xl text-sm font-bold transition-colors ${selectedCity === city
                                            ? "bg-orange-500 text-white"
                                            : "bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-500"
                                            }`}
                                    >
                                        {city}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* 検索結果 */
                <div className="flex-1">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-400">
                            {loading ? "検索中..." : `検索結果 ${shops.length}件`}
                        </h2>
                        <button
                            onClick={() => { clearAreaSelection(); setKeyword(""); }}
                            className="text-xs font-bold text-orange-500 hover:text-orange-600"
                        >
                            エリアを選び直す
                        </button>
                    </div>

                    <div className="flex flex-col divide-y divide-gray-200">
                        {!loading && shops.map((shop) => (
                            <Link
                                key={shop.id}
                                href={`/shop/${shop.id}`}
                                className="group flex gap-3 py-4 transition-colors hover:bg-gray-50"
                            >
                                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                    {shop.atmosphere_photos && shop.atmosphere_photos.length > 0 ? (
                                        <img
                                            src={shop.atmosphere_photos[0]}
                                            alt={shop.name}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex size-full items-center justify-center text-gray-400">
                                            <Store className="size-6 opacity-50" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-1 flex-col justify-center">
                                    <div className="mb-0.5 text-xs font-bold text-orange-500">
                                        {shop.genre}
                                    </div>
                                    <h3 className="mb-0.5 line-clamp-1 text-base font-bold text-gray-800 group-hover:text-orange-500">
                                        {shop.name}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <MapPin className="size-3 shrink-0" />
                                        <span className="line-clamp-1">{shop.address}</span>
                                    </div>
                                    {shop.price_range && (
                                        <p className="mt-0.5 text-xs font-bold text-orange-400">{shop.price_range}</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-center pl-1 text-gray-400">
                                    <ChevronRight className="size-5" />
                                </div>
                            </Link>
                        ))}

                        {!loading && shops.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Store className="mb-4 size-10 text-gray-300" />
                                <p className="text-sm font-bold text-gray-500">
                                    お探しの条件に一致するお店が<br />見つかりませんでした。
                                </p>
                                <p className="mt-2 text-xs text-gray-400">
                                    別のエリアやキーワードで検索してみてください
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
