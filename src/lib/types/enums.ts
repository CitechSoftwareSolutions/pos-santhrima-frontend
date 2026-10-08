export enum SaleStatus {
  Pending = 0,
  Completed = 1,
  Cancelled = 2,
  Refunded = 3,
  PartiallyRefunded = 4,
}

export enum PaymentMethod {
  Cash = 0,
  Card = 1,
  MobilePayment = 2,
  BankTransfer = 3,
  StoreCredit = 4,
  Other = 5,
}

export enum PaymentStatus {
  Unpaid = 0,
  PartiallyPaid = 1,
  Paid = 2,
  Refunded = 3,
}

export enum PurchaseApprovalStatus {
  PendingApproval = 0,
  Approved = 1,
}

export enum PromotionType {
  BuyXGetYFree = 0,
  BulkPercentOff = 1,
  FixedPriceBundle = 2,
}

export enum LoyaltyTransactionType {
  Earned = 0,
  Redeemed = 1,
  Expired = 2,
  MilestoneGiftClaimed = 3,
  Adjustment = 4,
}

export const ROLES = {
  Admin: "Admin",
  Manager: "Manager",
  Cashier: "Cashier",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const LoyaltyTransactionTypeLabels: Record<LoyaltyTransactionType, string> = {
  [LoyaltyTransactionType.Earned]: "Points Earned",
  [LoyaltyTransactionType.Redeemed]: "Points Redeemed",
  [LoyaltyTransactionType.Expired]: "Points Expired (3 Months)",
  [LoyaltyTransactionType.MilestoneGiftClaimed]: "Milestone Gift Claimed",
  [LoyaltyTransactionType.Adjustment]: "Manual/Void Adjustment",
};

export const SaleStatusLabels: Record<SaleStatus, string> = {
  [SaleStatus.Pending]: "Pending",
  [SaleStatus.Completed]: "Completed",
  [SaleStatus.Cancelled]: "Cancelled",
  [SaleStatus.Refunded]: "Refunded",
  [SaleStatus.PartiallyRefunded]: "Partially Refunded",
};

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: "Cash",
  [PaymentMethod.Card]: "Card",
  [PaymentMethod.MobilePayment]: "Mobile Payment",
  [PaymentMethod.BankTransfer]: "Bank Transfer",
  [PaymentMethod.StoreCredit]: "Store Credit",
  [PaymentMethod.Other]: "Other",
};

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.Unpaid]: "Unpaid",
  [PaymentStatus.PartiallyPaid]: "Partially Paid",
  [PaymentStatus.Paid]: "Paid",
  [PaymentStatus.Refunded]: "Refunded",
};

export const PurchaseApprovalStatusLabels: Record<PurchaseApprovalStatus, string> = {
  [PurchaseApprovalStatus.PendingApproval]: "Pending Approval",
  [PurchaseApprovalStatus.Approved]: "Approved",
};

export const PromotionTypeLabels: Record<PromotionType, string> = {
  [PromotionType.BuyXGetYFree]: "Buy X Get Y Free",
  [PromotionType.BulkPercentOff]: "Bulk % Off",
  [PromotionType.FixedPriceBundle]: "Fixed-Price Bundle",
};
