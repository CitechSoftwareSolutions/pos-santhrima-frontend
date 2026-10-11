import { apiClient } from "./client";
import type {
  TerminalDto,
  CreateTerminalRequest,
  UpdateTerminalRequest,
  SetTerminalCountRequest,
  AuthorizeSwitchRequest,
} from "@/lib/types";

export const terminalsApi = {
  getAll: (includeInactive = false) =>
    apiClient
      .get<TerminalDto[]>("/terminals", { params: { includeInactive } })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<TerminalDto>(`/terminals/${id}`).then((r) => r.data),

  create: (data: CreateTerminalRequest) =>
    apiClient.post<TerminalDto>("/terminals", data).then((r) => r.data),

  update: (id: string, data: UpdateTerminalRequest) =>
    apiClient.put<TerminalDto>(`/terminals/${id}`, data).then((r) => r.data),

  setCount: (data: SetTerminalCountRequest) =>
    apiClient.post<TerminalDto[]>("/terminals/set-count", data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/terminals/${id}`).then((r) => r.data),

  authorizeSwitch: (data: AuthorizeSwitchRequest) =>
    apiClient.post<boolean>("/terminals/authorize-switch", data).then((r) => r.data),
};
