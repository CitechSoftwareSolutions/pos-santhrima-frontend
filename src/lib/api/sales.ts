import { apiClient } from "./client";
import type {
  CreateSaleRequest,
  PagedResult,
  SaleDto,
  SaleListItemDto,
  SaleQueryParams,
} from "@/lib/types";

export const salesApi = {
  getAll: (params: SaleQueryParams) =>
    apiClient
      .get<PagedResult<SaleListItemDto>>("/sales", { params })
      .then((r) => r.data),

  getById: (id: string) => apiClient.get<SaleDto>(`/sales/${id}`).then((r) => r.data),

  create: (data: CreateSaleRequest) =>
    apiClient.post<SaleDto>("/sales", data).then((r) => r.data),

  void: (id: string, reason: string) =>
    apiClient.post<SaleDto>(`/sales/${id}/void`, reason).then((r) => r.data),

  refund: (id: string, saleItemIds: string[] | null, reason: string) =>
    apiClient
      .post<SaleDto>(`/sales/${id}/refund`, { saleItemIds, reason })
      .then((r) => r.data),
};
