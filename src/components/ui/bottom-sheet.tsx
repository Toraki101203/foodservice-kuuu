"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50" onClick={onClose} />
      <div
        ref={ref}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-30 max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]",
          className
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-gray-300" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-4 pt-2 pb-3">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <button onClick={onClose} aria-label="閉じる" className="p-1">
              <X className="size-5 text-gray-400" />
            </button>
          </div>
        )}
        <div className="px-4 pb-4">{children}</div>
      </div>
    </>
  );
}
