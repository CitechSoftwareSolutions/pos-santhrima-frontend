import { ChequeStatus } from "./enums";

export interface Cheque {
  id: string;
  chequeNumber: string;
  payee: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  bankName?: string | null;
  status: ChequeStatus;
  remarks?: string | null;
  isReminderSent: boolean;
  reminderSentAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ChequeSummary {
  totalPendingCount: number;
  totalPendingAmount: number;
  dueTodayCount: number;
  dueTodayAmount: number;
  overdueCount: number;
  overdueAmount: number;
  clearedCount: number;
  clearedAmount: number;
}

export interface CreateChequeInput {
  chequeNumber: string;
  payee: string;
  amount: number;
  dueDate: string;
  issueDate?: string | null;
  bankName?: string | null;
  remarks?: string | null;
}

export interface UpdateChequeInput {
  chequeNumber: string;
  payee: string;
  amount: number;
  dueDate: string;
  issueDate?: string | null;
  bankName?: string | null;
  remarks?: string | null;
  status: ChequeStatus;
}

export interface ChequeQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ChequeStatus;
  dueFilter?: "all" | "due_today" | "due_week" | "overdue";
  startDate?: string;
  endDate?: string;
}

export interface ChequeNotificationRecipient {
  id: string;
  name: string;
  phoneNumber: string;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface CreateRecipientInput {
  name: string;
  phoneNumber: string;
  isActive?: boolean;
  notes?: string | null;
}

export interface UpdateRecipientInput {
  name: string;
  phoneNumber: string;
  isActive: boolean;
  notes?: string | null;
}

export interface WhatsAppSetting {
  id: string;
  isEnabled: boolean;
  provider: string; // "Twilio" | "UltraMsg"
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioFromNumber?: string | null;
  ultraMsgInstanceId?: string | null;
  ultraMsgToken?: string | null;
  scheduledHour: number;
  scheduledMinute: number;
  timeZoneId: string;
  isConfiguredViaEnv?: boolean;
  hasConfiguredToken?: boolean;
}

export interface UpdateWhatsAppSettingInput {
  isEnabled: boolean;
  provider: string;
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioFromNumber?: string | null;
  ultraMsgInstanceId?: string | null;
  ultraMsgToken?: string | null;
  scheduledHour: number;
  scheduledMinute: number;
  timeZoneId: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  message: string;
  recipientsSentCount: number;
  chequesCount: number;
  errors?: string[] | null;
}
