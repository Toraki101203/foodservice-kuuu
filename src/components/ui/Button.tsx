import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98]",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-base",
    lg: "h-12 px-6 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => (
        <button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                variantStyles[variant],
                sizeStyles[size],
                className,
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            {children}
        </button>
    ),
);
Button.displayName = "Button";
