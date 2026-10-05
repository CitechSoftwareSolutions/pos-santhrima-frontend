import { apiClient } from "./client";
import type {
  AdjustStockRequest,
  CreateProductRequest,
  PagedResult,
  ProductDto,
  ProductQueryParams,
  UpdateProductRequest,
} from "@/lib/types";

export const productsApi = {
  getAll: (params: ProductQueryParams) =>
    apiClient
      .get<PagedResult<ProductDto>>("/products", { params })
      .then((r) => r.data),

  getById: (id: string) => apiClient.get<ProductDto>(`/products/${id}`).then((r) => r.data),

  lookupByCode: (code: string) =>
    apiClient
      .get<ProductDto>(`/products/lookup/${encodeURIComponent(code)}`)
      .then((r) => r.data)
      .catch(() => null),

  getLowStock: () => apiClient.get<ProductDto[]>("/products/low-stock").then((r) => r.data),

  create: (data: CreateProductRequest) =>
    apiClient.post<ProductDto>("/products", data).then((r) => r.data),

  update: (id: string, data: UpdateProductRequest) =>
    apiClient.put<ProductDto>(`/products/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/products/${id}`).then((r) => r.data),

  adjustStock: (id: string, data: AdjustStockRequest) =>
    apiClient.post<ProductDto>(`/products/${id}/adjust-stock`, data).then((r) => r.data),

  getNextSku: (categoryId: string) =>
    apiClient
      .get<{ sku: string }>("/products/next-sku", { params: { categoryId } })
      .then((r) => r.data.sku),
};
