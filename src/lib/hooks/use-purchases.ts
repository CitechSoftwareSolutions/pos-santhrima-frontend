import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchasesApi } from "@/lib/api/purchases";
import type { CreatePurchaseRequest, PurchaseQueryParams } from "@/lib/types";

export function usePurchases(params: PurchaseQueryParams) {
  return useQuery({
    queryKey: ["purchases", params],
    queryFn: () => purchasesApi.getAll(params),
    placeholderData: (prev) => prev,
  });
}

export function usePurchase(id: string | undefined) {
  return useQuery({
    queryKey: ["purchases", id],
    queryFn: () => purchasesApi.getById(id as string),
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePurchaseRequest) => purchasesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchases"] }),
  });
}

export function useApprovePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasesApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchases"] }),
  });
}

export function useAddPurchaseToStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasesApi.addToStock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useMarkPurchaseAsPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasesApi.markAsPaid(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchases"] }),
  });
}

export function useCancelPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasesApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchases"] }),
  });
}
