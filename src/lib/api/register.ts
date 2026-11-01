import { apiClient } from "./client";
import type {
  RegisterSessionDto,
  OpenRegisterRequest,
  CloseRegisterRequest,
  CounterDailySummaryDto,
} from "@/lib/types";

export const registerApi = {
  getCurrent: (terminalId: string) =>
    apiClient
      .get<RegisterSessionDto | null>("/registers/current", { params: { terminalId } })
      .then((r) => r.data),

  open: (data: OpenRegisterRequest) =>
    apiClient.post<RegisterSessionDto>("/registers/open", data).then((r) => r.data),

  close: (data: CloseRegisterRequest) =>
    apiClient.post<CounterDailySummaryDto>("/registers/close", data).then((r) => r.data),

  getTodaySummary: (terminalId: string) =>
    apiClient
      .get<CounterDailySummaryDto>("/registers/today-summary", { params: { terminalId } })
      .then((r) => r.data),
};
