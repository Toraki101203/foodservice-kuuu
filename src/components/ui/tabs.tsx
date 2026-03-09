"use client";
import { cn } from "@/lib/utils";

interface Tab {
    key: string;
    label: string;
}

interface TabsProps {
    tabs: Tab[];
    activeKey: string;
    onChange: (key: string) => void;
}

export function Tabs({ tabs, activeKey, onChange }: TabsProps) {
    return (
        <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    className={cn(
                        "flex-1 py-3 text-center text-sm font-medium transition-colors",
                        activeKey === tab.key
                            ? "border-b-2 border-orange-500 font-bold text-orange-500"
                            : "text-gray-500",
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
