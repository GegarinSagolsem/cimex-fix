import { AlertTriangle, AlertOctagon, Info, ArrowUpCircle, type LucideIcon } from "lucide-react";
import type { CaseSeverity } from "@bugproof/shared";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const SEVERITY_CONFIG: Record<CaseSeverity, { label: string; icon: LucideIcon; variant: BadgeVariant }> = {
  low: { label: "Low", icon: Info, variant: "default" },
  medium: { label: "Medium", icon: ArrowUpCircle, variant: "warning" },
  high: { label: "High", icon: AlertTriangle, variant: "danger" },
  critical: { label: "Critical", icon: AlertOctagon, variant: "danger" },
};

export function SeverityBadge({ severity }: { severity: CaseSeverity }) {
  const { label, icon: Icon, variant } = SEVERITY_CONFIG[severity];
  return (
    <Badge variant={variant}>
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </Badge>
  );
}
