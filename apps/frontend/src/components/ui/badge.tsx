import { cn } from "@/lib/utils";

const colorMap: Record<string, string> = {
  lost: "bg-red-100 text-red-700",
  found: "bg-green-100 text-green-700",
  active: "bg-blue-100 text-blue-700",
  matched: "bg-yellow-100 text-yellow-700",
  claimed: "bg-purple-100 text-purple-700",
  resolved: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  default: "bg-gray-100 text-gray-700",
};

interface BadgeProps {
  variant?: string;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorMap[variant] || colorMap.default,
        className
      )}
    >
      {children}
    </span>
  );
}
