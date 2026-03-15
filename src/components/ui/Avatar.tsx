import { cn } from "@/lib/utils";
import { User } from "lucide-react";

type AvatarProps = {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeStyles = {
  sm: "size-8",
  md: "size-10",
  lg: "size-20",
};

export function Avatar({ src, alt = "", size = "md", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-full bg-gray-100",
        sizeStyles[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center">
          <User className="size-1/2 text-gray-400" />
        </div>
      )}
    </div>
  );
}
