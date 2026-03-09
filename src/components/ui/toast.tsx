"use client";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";
import { useState, useCallback, useRef } from "react";

type ToastType = "success" | "error";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

let addToastFn: ((message: string, type: ToastType) => void) | null = null;

export function useToast() {
    return { toast: (message: string, type: ToastType = "success") => addToastFn?.(message, type) };
}

export function ToastProvider() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counterRef = useRef(0);

    addToastFn = useCallback((message: string, type: ToastType) => {
        const id = ++counterRef.current;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    }, []);

    return (
        <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cn(
                        "flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lg",
                    )}
                >
                    {t.type === "success" ? (
                        <CheckCircle className="size-5 text-green-600" />
                    ) : (
                        <XCircle className="size-5 text-red-600" />
                    )}
                    <span className="text-sm font-medium text-gray-700">{t.message}</span>
                </div>
            ))}
        </div>
    );
}
