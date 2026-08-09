import { apiClient } from "./client";
import type { CreatePurchaseRequest, PagedResult, PurchaseDto, PurchaseQueryParams } from "@/lib/types";

export const purchasesApi = {
  getAll: (params: PurchaseQueryParams) =>
    apiClient
      .get<PagedResult<PurchaseDto>>("/purchases", { params })
      .then((r) => r.data),

  getById: (id: string) => apiClient.get<PurchaseDto>(`/purchases/${id}`).then((r) => r.data),

  create: (data: CreatePurchaseRequest) =>
    apiClient.post<PurchaseDto>("/purchases", data).then((r) => r.data),

  approve: (id: string) =>
    apiClient.post<PurchaseDto>(`/purchases/${id}/approve`).then((r) => r.data),

  addToStock: (id: string) =>
    apiClient.post<PurchaseDto>(`/purchases/${id}/add-to-stock`).then((r) => r.data),

  markAsPaid: (id: string) =>
    apiClient.post<PurchaseDto>(`/purchases/${id}/mark-paid`).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.post<PurchaseDto>(`/purchases/${id}/cancel`).then((r) => r.data),
};
