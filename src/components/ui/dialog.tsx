"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
};

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cn(
        "fixed inset-0 z-40 m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/50",
        className
      )}
    >
      <div className="p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} aria-label="閉じる" className="p-1">
            <X className="size-5 text-gray-400" />
          </button>
        </div>
        {description && (
          <p className="mb-4 text-sm text-gray-500">{description}</p>
        )}
        {children}
      </div>
    </dialog>
  );
}
