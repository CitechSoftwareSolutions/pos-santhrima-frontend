import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { suppliersApi } from "@/lib/api/suppliers";
import type { CreateSupplierRequest, PaginationParams, UpdateSupplierRequest } from "@/lib/types";

export function useSuppliers(params: PaginationParams) {
  return useQuery({
    queryKey: ["suppliers", params],
    queryFn: () => suppliersApi.getAll(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSupplierRequest) => suppliersApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierRequest }) =>
      suppliersApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}
