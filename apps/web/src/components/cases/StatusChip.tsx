import {
  CircleDot,
  Search,
  FlaskConical,
  Wrench,
  ShieldCheck,
  ShieldX,
  type LucideIcon,
} from "lucide-react";
import type { CaseStatus } from "@bugproof/shared";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const STATUS_CONFIG: Record<CaseStatus, { label: string; icon: LucideIcon; variant: BadgeVariant }> = {
  open: { label: "Open", icon: CircleDot, variant: "default" },
  investigating: { label: "Investigating", icon: Search, variant: "accent" },
  reproduced: { label: "Reproduced", icon: FlaskConical, variant: "warning" },
  fixing: { label: "Fixing", icon: Wrench, variant: "agent" },
  proven: { label: "Proven", icon: ShieldCheck, variant: "success" },
  unproven: { label: "Unproven", icon: ShieldX, variant: "danger" },
};

export function StatusChip({ status }: { status: CaseStatus }) {
  const { label, icon: Icon, variant } = STATUS_CONFIG[status];
  return (
    <Badge variant={variant}>
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </Badge>
  );
}
