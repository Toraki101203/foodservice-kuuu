import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarProps {
    src: string | null | undefined;
    alt: string;
    size?: number;
    className?: string;
}

export function Avatar({ src, alt, size = 40, className }: AvatarProps) {
    return (
        <div className={cn("relative overflow-hidden rounded-full bg-gray-200", className)} style={{ width: size, height: size }}>
            {src ? (
                <Image src={src} alt={alt} fill className="object-cover" sizes={`${size}px`} />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                    {alt.charAt(0).toUpperCase()}
                </div>
            )}
        </div>
    );
}
