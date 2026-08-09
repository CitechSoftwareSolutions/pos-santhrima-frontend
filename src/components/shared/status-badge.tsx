import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PaymentStatus,
  PurchaseApprovalStatus,
  SaleStatus,
  PaymentStatusLabels,
  PurchaseApprovalStatusLabels,
  SaleStatusLabels,
} from "@/lib/types";

const toneClasses: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400 border-transparent",
  info: "bg-primary/10 text-primary border-transparent",
};

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const tone =
    status === SaleStatus.Completed
      ? "success"
      : status === SaleStatus.Pending
        ? "warning"
        : status === SaleStatus.Cancelled
          ? "danger"
          : "info";

  return <Badge className={cn(toneClasses[tone])}>{SaleStatusLabels[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const tone =
    status === PaymentStatus.Paid
      ? "success"
      : status === PaymentStatus.PartiallyPaid
        ? "warning"
        : status === PaymentStatus.Refunded
          ? "danger"
          : "neutral";

  return <Badge className={cn(toneClasses[tone])}>{PaymentStatusLabels[status]}</Badge>;
}

export function PurchaseApprovalStatusBadge({ status }: { status: PurchaseApprovalStatus }) {
  const tone = status === PurchaseApprovalStatus.Approved ? "success" : "warning";

  return <Badge className={cn(toneClasses[tone])}>{PurchaseApprovalStatusLabels[status]}</Badge>;
}
