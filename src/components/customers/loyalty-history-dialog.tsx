"use client";

import { Award, Clock, Gift, History, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useClaimMilestoneGift,
  useCustomer,
  useCustomerLoyaltyHistory,
} from "@/lib/hooks/use-customers";
import { formatCurrency, formatDate } from "@/lib/format";
import { LoyaltyTransactionType, LoyaltyTransactionTypeLabels, type CustomerDto } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

export function CustomerLoyaltyHistoryDialog({
  customer: initialCustomer,
  open,
  onOpenChange,
}: {
  customer: CustomerDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const customerQuery = useCustomer(initialCustomer?.id ?? null);
  const historyQuery = useCustomerLoyaltyHistory(initialCustomer?.id ?? null);
  const claimGift = useClaimMilestoneGift();

  const customer = customerQuery.data ?? initialCustomer;

  if (!customer) return null;

  function handleClaimGift() {
    if (!customer) return;
    claimGift.mutate(customer.id, {
      onSuccess: () => {
        toast.success("Milestone gift successfully claimed!");
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err));
      },
    });
  }

  const unclaimedGifts = Math.max(0, customer.milestoneTier - customer.milestoneGiftsClaimed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-6">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Award className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">Royalty Points & Milestones</DialogTitle>
                <DialogDescription>
                  Customer: <span className="font-semibold text-foreground">{customer.name}</span>
                </DialogDescription>
              </div>
            </div>

            {customer.isEligibleForGift && (
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1.5 shadow-sm"
                disabled={claimGift.isPending}
                onClick={handleClaimGift}
              >
                <Gift className="size-4" />
                {claimGift.isPending ? "Claiming..." : `Claim Gift (${unclaimedGifts} available)`}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="size-3.5" /> Total Purchases
            </p>
            <p className="mt-1 text-base font-semibold">{formatCurrency(customer.totalPurchases)}</p>
            <p className="text-[11px] text-muted-foreground">
              Tier {customer.milestoneTier} ({customer.milestoneTier * 100}k reached)
            </p>
          </div>

          <div className="rounded-xl border bg-amber-500/10 border-amber-500/20 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
              <Sparkles className="size-3.5" /> Remaining Points
            </p>
            <p className="mt-1 text-base font-bold text-amber-700 dark:text-amber-300">
              {customer.loyaltyPoints.toFixed(2)} pts
            </p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
              Value: {formatCurrency(customer.loyaltyPoints)}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Points Redeemed</p>
            <p className="mt-1 text-base font-semibold">{customer.loyaltyPointsRedeemed.toFixed(2)} pts</p>
            <p className="text-[11px] text-muted-foreground">
              Saved {formatCurrency(customer.loyaltyPointsRedeemed)}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3.5" /> Points Expired
            </p>
            <p className="mt-1 text-base font-semibold text-muted-foreground">
              {customer.loyaltyPointsExpired.toFixed(2)} pts
            </p>
            <p className="text-[11px] text-muted-foreground">&gt; 3 months unredeemed</p>
          </div>
        </div>

        {/* Milestone Bar */}
        <div className="rounded-lg border bg-background p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between font-medium">
            <span className="flex items-center gap-1.5">
              <Gift className="size-3.5 text-primary" /> Milestone Progress
            </span>
            <span className="text-muted-foreground">
              {customer.canRedeemPoints
                ? `Redemption Unlocked · Next: Rs. ${customer.nextMilestoneAmount.toLocaleString()}`
                : `Need ${formatCurrency(customer.amountToNextMilestone)} to unlock redemption`}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${Math.min(
                  100,
                  customer.nextMilestoneAmount > 0
                    ? ((customer.totalPurchases % 100000) / 100000) * 100
                    : 100,
                )}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Points can be redeemed and milestone gifts unlocked at each Rs. 100,000 threshold.
          </p>
        </div>

        {/* Ledger Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="size-3.5" /> Points Ledger History
            </h4>
            <span className="text-[11px] text-muted-foreground">3-month rolling expiration</span>
          </div>

          <div className="rounded-lg border">
            <ScrollArea className="h-64">
              {historyQuery.isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : historyQuery.data && historyQuery.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyQuery.data.map((tx) => {
                      const isEarned = tx.type === LoyaltyTransactionType.Earned;
                      const isRedeemed = tx.type === LoyaltyTransactionType.Redeemed;
                      const isExpired = tx.type === LoyaltyTransactionType.Expired;
                      const isGift = tx.type === LoyaltyTransactionType.MilestoneGiftClaimed;

                      return (
                        <TableRow key={tx.id} className="text-xs">
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {formatDate(tx.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                isEarned
                                  ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : isRedeemed
                                  ? "border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                  : isExpired
                                  ? "border-rose-500/40 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                  : isGift
                                  ? "border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                  : ""
                              }
                            >
                              {LoyaltyTransactionTypeLabels[tx.type as LoyaltyTransactionType] ?? "Transaction"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">
                            {tx.points > 0 ? (
                              <span className="text-emerald-600">+{tx.points.toFixed(2)}</span>
                            ) : tx.points < 0 ? (
                              <span className="text-rose-600">{tx.points.toFixed(2)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {tx.expiresAt ? (
                              <span
                                className={
                                  tx.isExpired ? "text-rose-500 font-medium line-through" : "text-muted-foreground"
                                }
                              >
                                {formatDate(tx.expiresAt)}
                                {tx.isExpired && " (Expired)"}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {tx.saleNumber || "—"}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-muted-foreground" title={tx.notes ?? ""}>
                            {tx.notes || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No royalty point transactions recorded yet.
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
