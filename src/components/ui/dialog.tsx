"use client";
import { cn } from "@/lib/utils";
import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
}

export function Dialog({ open, onClose, title, description, children }: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const el = dialogRef.current;
        if (!el) return;
        if (open && !el.open) el.showModal();
        else if (!open && el.open) el.close();
    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            className={cn(
                "m-auto max-w-sm rounded-2xl bg-white p-6 shadow-xl backdrop:bg-black/50",
            )}
        >
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {description && <p className="mt-1 text-gray-600">{description}</p>}
            <div className="mt-4 flex justify-end gap-2">{children}</div>
        </dialog>
    );
}
