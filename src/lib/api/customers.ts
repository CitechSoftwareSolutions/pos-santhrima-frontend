import { apiClient } from "./client";
import type {
  CreateCustomerRequest,
  CustomerDto,
  PagedResult,
  PaginationParams,
  UpdateCustomerRequest,
} from "@/lib/types";

export const customersApi = {
  getAll: (params: PaginationParams) =>
    apiClient
      .get<PagedResult<CustomerDto>>("/customers", { params })
      .then((r) => r.data),

  getById: (id: string) => apiClient.get<CustomerDto>(`/customers/${id}`).then((r) => r.data),

  create: (data: CreateCustomerRequest) =>
    apiClient.post<CustomerDto>("/customers", data).then((r) => r.data),

  update: (id: string, data: UpdateCustomerRequest) =>
    apiClient.put<CustomerDto>(`/customers/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/customers/${id}`).then((r) => r.data),
};
