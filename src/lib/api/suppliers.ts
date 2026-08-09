import { apiClient } from "./client";
import type {
  CreateSupplierRequest,
  PagedResult,
  PaginationParams,
  SupplierDto,
  UpdateSupplierRequest,
} from "@/lib/types";

export const suppliersApi = {
  getAll: (params: PaginationParams) =>
    apiClient
      .get<PagedResult<SupplierDto>>("/suppliers", { params })
      .then((r) => r.data),

  getById: (id: string) => apiClient.get<SupplierDto>(`/suppliers/${id}`).then((r) => r.data),

  create: (data: CreateSupplierRequest) =>
    apiClient.post<SupplierDto>("/suppliers", data).then((r) => r.data),

  update: (id: string, data: UpdateSupplierRequest) =>
    apiClient.put<SupplierDto>(`/suppliers/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/suppliers/${id}`).then((r) => r.data),
};
