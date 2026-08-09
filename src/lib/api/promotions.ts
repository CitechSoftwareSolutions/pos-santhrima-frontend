import { apiClient } from "./client";
import type { CreatePromotionRequest, PromotionDto, UpdatePromotionRequest } from "@/lib/types";

export const promotionsApi = {
  getAll: (productId?: string) =>
    apiClient.get<PromotionDto[]>("/promotions", { params: { productId } }).then((r) => r.data),

  getById: (id: string) => apiClient.get<PromotionDto>(`/promotions/${id}`).then((r) => r.data),

  create: (data: CreatePromotionRequest) =>
    apiClient.post<PromotionDto>("/promotions", data).then((r) => r.data),

  update: (id: string, data: UpdatePromotionRequest) =>
    apiClient.put<PromotionDto>(`/promotions/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/promotions/${id}`).then((r) => r.data),
};
