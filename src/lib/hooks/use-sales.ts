import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { salesApi } from "@/lib/api/sales";
import type { CreateSaleRequest, SaleQueryParams } from "@/lib/types";

export function useSales(params: SaleQueryParams) {
  return useQuery({
    queryKey: ["sales", params],
    queryFn: () => salesApi.getAll(params),
    placeholderData: (prev) => prev,
  });
}

export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: ["sales", id],
    queryFn: () => salesApi.getById(id as string),
    enabled: !!id,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSaleRequest) => salesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useVoidSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesApi.void(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useRefundSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      saleItemIds,
      reason,
    }: {
      id: string;
      saleItemIds: string[] | null;
      reason: string;
    }) => salesApi.refund(id, saleItemIds, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
