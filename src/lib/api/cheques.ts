import { apiClient } from "./client";
import type {
  Cheque,
  ChequeSummary,
  CreateChequeInput,
  UpdateChequeInput,
  ChequeQueryParams,
  ChequeNotificationRecipient,
  CreateRecipientInput,
  UpdateRecipientInput,
  WhatsAppSetting,
  UpdateWhatsAppSettingInput,
  WhatsAppSendResult,
  PagedResult,
} from "@/lib/types";
import { ChequeStatus } from "@/lib/types/enums";

export async function getCheques(params: ChequeQueryParams = {}): Promise<PagedResult<Cheque>> {
  const { data } = await apiClient.get<PagedResult<Cheque>>("/cheques", { params });
  return data;
}

export async function getChequeSummary(): Promise<ChequeSummary> {
  const { data } = await apiClient.get<ChequeSummary>("/cheques/summary");
  return data;
}

export async function getChequeById(id: string): Promise<Cheque> {
  const { data } = await apiClient.get<Cheque>(`/cheques/${id}`);
  return data;
}

export async function createCheque(input: CreateChequeInput): Promise<Cheque> {
  const { data } = await apiClient.post<Cheque>("/cheques", input);
  return data;
}

export async function updateCheque(id: string, input: UpdateChequeInput): Promise<Cheque> {
  const { data } = await apiClient.put<Cheque>(`/cheques/${id}`, input);
  return data;
}

export async function updateChequeStatus(
  id: string,
  status: ChequeStatus,
  remarks?: string,
): Promise<Cheque> {
  const { data } = await apiClient.patch<Cheque>(`/cheques/${id}/status`, { status, remarks });
  return data;
}

export async function deleteCheque(id: string): Promise<void> {
  await apiClient.delete(`/cheques/${id}`);
}

// Recipients
export async function getRecipients(): Promise<ChequeNotificationRecipient[]> {
  const { data } = await apiClient.get<ChequeNotificationRecipient[]>("/cheques/recipients");
  return data;
}

export async function createRecipient(input: CreateRecipientInput): Promise<ChequeNotificationRecipient> {
  const { data } = await apiClient.post<ChequeNotificationRecipient>("/cheques/recipients", input);
  return data;
}

export async function updateRecipient(
  id: string,
  input: UpdateRecipientInput,
): Promise<ChequeNotificationRecipient> {
  const { data } = await apiClient.put<ChequeNotificationRecipient>(`/cheques/recipients/${id}`, input);
  return data;
}

export async function deleteRecipient(id: string): Promise<void> {
  await apiClient.delete(`/cheques/recipients/${id}`);
}

// WhatsApp Settings & Triggers
export async function getWhatsAppSettings(): Promise<WhatsAppSetting> {
  const { data } = await apiClient.get<WhatsAppSetting>("/cheques/settings");
  return data;
}

export async function updateWhatsAppSettings(input: UpdateWhatsAppSettingInput): Promise<WhatsAppSetting> {
  const { data } = await apiClient.put<WhatsAppSetting>("/cheques/settings", input);
  return data;
}

export async function sendDueChequeReminders(forceAll: boolean = false): Promise<WhatsAppSendResult> {
  const { data } = await apiClient.post<WhatsAppSendResult>("/cheques/send-due-reminders", null, {
    params: { forceAll },
  });
  return data;
}

export async function testWhatsApp(phoneNumber: string, message?: string): Promise<WhatsAppSendResult> {
  const { data } = await apiClient.post<WhatsAppSendResult>("/cheques/test-whatsapp", {
    phoneNumber,
    message,
  });
  return data;
}
