import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    noBorder?: boolean;
}

export function Card({ className, noBorder, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "overflow-hidden rounded-2xl bg-white",
                !noBorder && "border border-gray-100 shadow-sm",
                className,
            )}
            {...props}
        />
    );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("p-4", className)} {...props} />;
}
