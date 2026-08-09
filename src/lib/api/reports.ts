import { apiClient } from "./client";
import type {
  DailySalesDto,
  InventoryValuationDto,
  LowStockReportItemDto,
  PaymentMethodBreakdownDto,
  SalesSummaryDto,
  TopProductDto,
} from "@/lib/types";

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

export const reportsApi = {
  getSalesSummary: (range: DateRange) =>
    apiClient
      .get<SalesSummaryDto>("/reports/sales-summary", { params: range })
      .then((r) => r.data),

  getDailySales: (range: DateRange) =>
    apiClient
      .get<DailySalesDto[]>("/reports/daily-sales", { params: range })
      .then((r) => r.data),

  getTopProducts: (range: DateRange, take = 10) =>
    apiClient
      .get<TopProductDto[]>("/reports/top-products", { params: { ...range, take } })
      .then((r) => r.data),

  getLowStock: () =>
    apiClient.get<LowStockReportItemDto[]>("/reports/low-stock").then((r) => r.data),

  getInventoryValuation: () =>
    apiClient.get<InventoryValuationDto>("/reports/inventory-valuation").then((r) => r.data),

  getPaymentMethodBreakdown: (range: DateRange) =>
    apiClient
      .get<PaymentMethodBreakdownDto[]>("/reports/payment-methods", { params: range })
      .then((r) => r.data),
};
