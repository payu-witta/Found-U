import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ className, hoverable, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-900 dark:bg-black",
        hoverable && "transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-lg dark:hover:shadow-gray-900/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
