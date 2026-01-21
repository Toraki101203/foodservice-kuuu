import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarProps {
    src?: string | null;
    alt: string;
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

/**
 * アバター画像コンポーネント
 */
export function Avatar({ src, alt, size = "md", className }: AvatarProps) {
    const sizes = {
        sm: "size-8",
        md: "size-10",
        lg: "size-12",
        xl: "size-16",
    };

    const imageSizes = {
        sm: 32,
        md: 40,
        lg: 48,
        xl: 64,
    };

    // イニシャルを取得
    const initial = alt.charAt(0).toUpperCase();

    return (
        <div
            className={cn(
                "relative flex-shrink-0 overflow-hidden rounded-full bg-orange-100",
                sizes[size],
                className
            )}
        >
            {src ? (
                <Image
                    src={src}
                    alt={alt}
                    width={imageSizes[size]}
                    height={imageSizes[size]}
                    className="size-full object-cover"
                />
            ) : (
                <div className="flex size-full items-center justify-center text-orange-600 font-medium">
                    {initial}
                </div>
            )}
        </div>
    );
}
