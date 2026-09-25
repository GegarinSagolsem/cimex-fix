import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
        success: "border-transparent bg-[var(--success)]/15 text-[var(--success)]",
        danger: "border-transparent bg-[var(--danger)]/15 text-[var(--danger)]",
        warning: "border-transparent bg-[var(--warning)]/15 text-[var(--warning)]",
        agent: "border-transparent bg-[var(--agent)]/15 text-[var(--agent)]",
        accent: "border-transparent bg-[var(--accent)]/15 text-[var(--accent)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
