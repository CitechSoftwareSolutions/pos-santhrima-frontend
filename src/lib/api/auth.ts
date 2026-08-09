import { apiClient } from "./client";
import type { AuthResponse, LoginRequest, RegisterRequest, UserDto } from "@/lib/types";

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>("/auth/login", data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>("/auth/register", data).then((r) => r.data),

  getUsers: () => apiClient.get<UserDto[]>("/auth/users").then((r) => r.data),

  setUserStatus: (id: string, isActive: boolean) =>
    apiClient.patch(`/auth/users/${id}/status`, isActive).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient
      .post("/auth/change-password", { currentPassword, newPassword })
      .then((r) => r.data),
};
