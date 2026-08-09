import { useQuery } from "@tanstack/react-query";
import { reportsApi, type DateRange } from "@/lib/api/reports";

export function useSalesSummary(range: DateRange) {
  return useQuery({
    queryKey: ["reports", "sales-summary", range],
    queryFn: () => reportsApi.getSalesSummary(range),
  });
}

export function useDailySales(range: DateRange) {
  return useQuery({
    queryKey: ["reports", "daily-sales", range],
    queryFn: () => reportsApi.getDailySales(range),
  });
}

export function useTopProducts(range: DateRange, take = 10) {
  return useQuery({
    queryKey: ["reports", "top-products", range, take],
    queryFn: () => reportsApi.getTopProducts(range, take),
  });
}

export function useLowStockReport() {
  return useQuery({
    queryKey: ["reports", "low-stock"],
    queryFn: () => reportsApi.getLowStock(),
  });
}

export function useInventoryValuation() {
  return useQuery({
    queryKey: ["reports", "inventory-valuation"],
    queryFn: () => reportsApi.getInventoryValuation(),
  });
}

export function usePaymentMethodBreakdown(range: DateRange) {
  return useQuery({
    queryKey: ["reports", "payment-methods", range],
    queryFn: () => reportsApi.getPaymentMethodBreakdown(range),
  });
}
