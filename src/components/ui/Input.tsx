import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, id, ...props }, ref) => (
        <div className="space-y-1">
            {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>}
            <input
                ref={ref}
                id={id}
                className={cn(
                    "h-11 w-full rounded-xl border border-gray-200 px-4 text-base transition-shadow",
                    "placeholder:text-gray-400",
                    "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500",
                    error && "border-transparent ring-2 ring-red-500",
                    className,
                )}
                {...props}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    ),
);
Input.displayName = "Input";
