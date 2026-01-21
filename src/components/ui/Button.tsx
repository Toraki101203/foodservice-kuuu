import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
}

/**
 * 汎用ボタンコンポーネント
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "primary",
            size = "md",
            isLoading = false,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        const baseStyles =
            "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg";

        const variants = {
            primary:
                "bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500",
            secondary:
                "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500",
            outline:
                "border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-gray-500",
            ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
            danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
        };

        const sizes = {
            sm: "px-3 py-1.5 text-sm min-h-[36px]",
            md: "px-4 py-2 text-base min-h-[44px]",
            lg: "px-6 py-3 text-lg min-h-[52px]",
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

export { Button };
