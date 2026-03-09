"use client";
import type { ReactNode } from "react";

interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-30" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50" />
            <div
                className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-6 pb-safe"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
                {children}
            </div>
        </div>
    );
}
