import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCheques,
  getChequeSummary,
  getChequeById,
  createCheque,
  updateCheque,
  updateChequeStatus,
  deleteCheque,
  getRecipients,
  createRecipient,
  updateRecipient,
  deleteRecipient,
  getWhatsAppSettings,
  updateWhatsAppSettings,
  sendDueChequeReminders,
  testWhatsApp,
} from "@/lib/api/cheques";
import type {
  ChequeQueryParams,
  CreateChequeInput,
  UpdateChequeInput,
  CreateRecipientInput,
  UpdateRecipientInput,
  UpdateWhatsAppSettingInput,
} from "@/lib/types";
import { ChequeStatus } from "@/lib/types/enums";

export function useCheques(params: ChequeQueryParams) {
  return useQuery({
    queryKey: ["cheques", params],
    queryFn: () => getCheques(params),
    placeholderData: (prev) => prev,
  });
}

export function useChequeSummary() {
  return useQuery({
    queryKey: ["cheque-summary"],
    queryFn: getChequeSummary,
  });
}

export function useCheque(id: string | null) {
  return useQuery({
    queryKey: ["cheque", id],
    queryFn: () => (id ? getChequeById(id) : null),
    enabled: !!id,
  });
}

export function useCreateCheque() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChequeInput) => createCheque(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      queryClient.invalidateQueries({ queryKey: ["cheque-summary"] });
    },
  });
}

export function useUpdateCheque() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChequeInput }) => updateCheque(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      queryClient.invalidateQueries({ queryKey: ["cheque-summary"] });
    },
  });
}

export function useUpdateChequeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, remarks }: { id: string; status: ChequeStatus; remarks?: string }) =>
      updateChequeStatus(id, status, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      queryClient.invalidateQueries({ queryKey: ["cheque-summary"] });
    },
  });
}

export function useDeleteCheque() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCheque(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      queryClient.invalidateQueries({ queryKey: ["cheque-summary"] });
    },
  });
}

// Recipients Hooks
export function useWhatsAppRecipients() {
  return useQuery({
    queryKey: ["whatsapp-recipients"],
    queryFn: getRecipients,
  });
}

export function useCreateRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRecipientInput) => createRecipient(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-recipients"] }),
  });
}

export function useUpdateRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecipientInput }) => updateRecipient(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-recipients"] }),
  });
}

export function useDeleteRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecipient(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-recipients"] }),
  });
}

// WhatsApp Settings & Actions
export function useWhatsAppSettings() {
  return useQuery({
    queryKey: ["whatsapp-settings"],
    queryFn: getWhatsAppSettings,
  });
}

export function useUpdateWhatsAppSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateWhatsAppSettingInput) => updateWhatsAppSettings(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-settings"] }),
  });
}

export function useSendDueChequeReminders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (forceAll?: boolean) => sendDueChequeReminders(forceAll),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      queryClient.invalidateQueries({ queryKey: ["cheque-summary"] });
    },
  });
}

export function useTestWhatsApp() {
  return useMutation({
    mutationFn: ({ phoneNumber, message }: { phoneNumber: string; message?: string }) =>
      testWhatsApp(phoneNumber, message),
  });
}
