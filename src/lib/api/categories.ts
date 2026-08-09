import { apiClient } from "./client";
import type { CategoryDto, CreateCategoryRequest, UpdateCategoryRequest } from "@/lib/types";

export const categoriesApi = {
  getAll: (includeInactive = false) =>
    apiClient
      .get<CategoryDto[]>("/categories", { params: { includeInactive } })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<CategoryDto>(`/categories/${id}`).then((r) => r.data),

  create: (data: CreateCategoryRequest) =>
    apiClient.post<CategoryDto>("/categories", data).then((r) => r.data),

  update: (id: string, data: UpdateCategoryRequest) =>
    apiClient.put<CategoryDto>(`/categories/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/categories/${id}`).then((r) => r.data),
};
