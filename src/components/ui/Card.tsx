import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
    children: ReactNode;
    className?: string;
    padding?: "none" | "sm" | "md" | "lg";
}

/**
 * カードコンテナコンポーネント
 */
export function Card({ children, className, padding = "md" }: CardProps) {
    const paddings = {
        none: "",
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
    };

    return (
        <div
            className={cn(
                "bg-white rounded-xl border border-gray-200 shadow-sm",
                paddings[padding],
                className
            )}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    children: ReactNode;
    className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
    return (
        <div className={cn("border-b border-gray-100 pb-4 mb-4", className)}>
            {children}
        </div>
    );
}

interface CardTitleProps {
    children: ReactNode;
    className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
    return (
        <h3 className={cn("text-lg font-semibold text-gray-900", className)}>
            {children}
        </h3>
    );
}

interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
    return <div className={cn("", className)}>{children}</div>;
}
