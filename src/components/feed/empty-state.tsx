import Link from "next/link";
import { Button } from "@/components/ui";

interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
}

export function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-bold text-gray-900">{title}</p>
            <p className="mt-2 text-sm text-gray-500">{description}</p>
            {actionLabel && actionHref && (
                <Link href={actionHref} className="mt-6">
                    <Button size="sm">{actionLabel}</Button>
                </Link>
            )}
        </div>
    );
}
