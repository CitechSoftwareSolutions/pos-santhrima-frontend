import { apiClient } from "./client";
import type { StoreSettingsDto, UpdateStoreSettingsRequest } from "@/lib/types";

export const settingsApi = {
  get: () => apiClient.get<StoreSettingsDto>("/settings").then((r) => r.data),

  update: (data: UpdateStoreSettingsRequest) =>
    apiClient.put<StoreSettingsDto>("/settings", data).then((r) => r.data),

  toggleSalesShift: (enabled?: boolean) =>
    apiClient
      .post<StoreSettingsDto>(
        "/settings/toggle-sales-shift",
        null,
        enabled !== undefined ? { params: { enabled } } : undefined
      )
      .then((r) => r.data),
};

