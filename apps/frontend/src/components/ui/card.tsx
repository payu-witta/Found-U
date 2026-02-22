import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ className, hoverable, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "elevated-surface soft-border rounded-2xl",
        hoverable &&
          "transform-gpu transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgb(0_0_0/0.12)] dark:hover:shadow-[0_16px_32px_rgb(0_0_0/0.35)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
