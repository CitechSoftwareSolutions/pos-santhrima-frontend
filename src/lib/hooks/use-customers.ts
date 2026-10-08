import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/lib/api/customers";
import type { CreateCustomerRequest, PaginationParams, UpdateCustomerRequest } from "@/lib/types";

export function useCustomers(params: PaginationParams) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => customersApi.getAll(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerRequest) => customersApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerRequest }) =>
      customersApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: () => (id ? customersApi.getById(id) : null),
    enabled: !!id,
  });
}

export function useCustomerLoyaltyHistory(id: string | null) {
  return useQuery({
    queryKey: ["customer", id, "loyalty-history"],
    queryFn: () => (id ? customersApi.getLoyaltyHistory(id) : []),
    enabled: !!id,
  });
}

export function useClaimMilestoneGift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.claimGift(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customer", id, "loyalty-history"] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}
