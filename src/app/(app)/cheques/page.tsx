"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Search,
  Bell,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Settings2,
  UserCheck,
  Check,
  XCircle,
  Phone,
  RefreshCw,
  MoreVertical,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { RequireRole } from "@/components/shared/require-role";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCheques,
  useChequeSummary,
  useCreateCheque,
  useUpdateCheque,
  useUpdateChequeStatus,
  useDeleteCheque,
  useWhatsAppRecipients,
  useCreateRecipient,
  useUpdateRecipient,
  useDeleteRecipient,
  useWhatsAppSettings,
  useUpdateWhatsAppSettings,
  useSendDueChequeReminders,
  useTestWhatsApp,
} from "@/lib/hooks/use-cheques";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { formatCurrency, formatDateOnly, toDateInputValue } from "@/lib/format";
import { ROLES, ChequeStatus, ChequeStatusLabels, type Cheque, type ChequeNotificationRecipient } from "@/lib/types";

interface ChequeFormState {
  chequeNumber: string;
  payee: string;
  amount: string;
  dueDate: string;
  issueDate: string;
  bankName: string;
  remarks: string;
}

const emptyChequeForm: ChequeFormState = {
  chequeNumber: "",
  payee: "",
  amount: "",
  dueDate: toDateInputValue(new Date()),
  issueDate: toDateInputValue(new Date()),
  bankName: "",
  remarks: "",
};

export default function ChequesPage() {
  return (
    <RequireRole roles={[ROLES.Admin]}>
      <ChequesPageContent />
    </RequireRole>
  );
}

function ChequesPageContent() {
  const [activeTab, setActiveTab] = useState<"cheques" | "whatsapp">("cheques");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dueFilter, setDueFilter] = useState<"all" | "due_today" | "due_week" | "overdue">("all");

  // Dialog States
  const [isAddChequeOpen, setIsAddChequeOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
  const [chequeForm, setChequeForm] = useState<ChequeFormState>(emptyChequeForm);

  const [deleteChequeId, setDeleteChequeId] = useState<string | null>(null);

  // Recipient States
  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<ChequeNotificationRecipient | null>(null);
  const [recipientForm, setRecipientForm] = useState({
    name: "",
    phoneNumber: "",
    isActive: true,
    notes: "",
  });
  const [deleteRecipientId, setDeleteRecipientId] = useState<string | null>(null);

  // Test WhatsApp Dialog
  const [isTestWhatsAppOpen, setIsTestWhatsAppOpen] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testMessage, setTestMessage] = useState("");

  // Queries & Mutations
  const { data: summary, isLoading: isSummaryLoading } = useChequeSummary();
  const { data: chequesData, isLoading: isChequesLoading, refetch: refetchCheques } = useCheques({
    page,
    pageSize: 15,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? (Number(statusFilter) as ChequeStatus) : undefined,
    dueFilter,
  });

  const { data: recipients, isLoading: isRecipientsLoading } = useWhatsAppRecipients();
  const { data: waSettings, isLoading: isSettingsLoading } = useWhatsAppSettings();

  const createChequeMutation = useCreateCheque();
  const updateChequeMutation = useUpdateCheque();
  const updateStatusMutation = useUpdateChequeStatus();
  const deleteChequeMutation = useDeleteCheque();

  const createRecipientMutation = useCreateRecipient();
  const updateRecipientMutation = useUpdateRecipient();
  const deleteRecipientMutation = useDeleteRecipient();

  const updateSettingsMutation = useUpdateWhatsAppSettings();
  const sendDueRemindersMutation = useSendDueChequeReminders();
  const testWhatsAppMutation = useTestWhatsApp();

  // Settings form local state
  const [settingsForm, setSettingsForm] = useState<{
    isEnabled: boolean;
    provider: string;
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioFromNumber: string;
    ultraMsgInstanceId: string;
    ultraMsgToken: string;
    scheduledHour: number;
    scheduledMinute: number;
    timeZoneId: string;
  } | null>(null);

  // Sync settings when loaded
  useEffect(() => {
    if (waSettings) {
      setSettingsForm({
        isEnabled: waSettings.isEnabled,
        provider: waSettings.provider || "Twilio",
        twilioAccountSid: waSettings.twilioAccountSid || "",
        twilioAuthToken: waSettings.twilioAuthToken || "",
        twilioFromNumber: waSettings.twilioFromNumber || "whatsapp:+14155238886",
        ultraMsgInstanceId: waSettings.ultraMsgInstanceId || "",
        ultraMsgToken: waSettings.ultraMsgToken || "",
        scheduledHour: waSettings.scheduledHour ?? 8,
        scheduledMinute: waSettings.scheduledMinute ?? 0,
        timeZoneId: waSettings.timeZoneId || "Asia/Colombo",
      });
    }
  }, [waSettings]);

  // 12-hour & AM/PM helpers
  const scheduledHour = settingsForm?.scheduledHour ?? waSettings?.scheduledHour ?? 8;
  const scheduledMinute = settingsForm?.scheduledMinute ?? waSettings?.scheduledMinute ?? 0;
  const hour12 = (scheduledHour % 12 === 0 ? 12 : scheduledHour % 12).toString();
  const period = scheduledHour >= 12 ? "PM" : "AM";
  const minuteStr = scheduledMinute.toString().padStart(2, "0");
  const formattedScheduleTime = `${hour12}:${minuteStr} ${period}`;

  const handleTimeChange = (newHour12: number, newMin: number, newPeriod: "AM" | "PM") => {
    let hour24 = newHour12;
    if (newPeriod === "AM") {
      hour24 = newHour12 === 12 ? 0 : newHour12;
    } else {
      hour24 = newHour12 === 12 ? 12 : newHour12 + 12;
    }
    setSettingsForm((prev) =>
      prev ? { ...prev, scheduledHour: hour24, scheduledMinute: newMin } : null
    );
  };

  // Handle open add cheque
  const handleOpenAdd = () => {
    setEditingCheque(null);
    setChequeForm({
      ...emptyChequeForm,
      dueDate: toDateInputValue(new Date()),
      issueDate: toDateInputValue(new Date()),
    });
    setIsAddChequeOpen(true);
  };

  // Handle open edit cheque
  const handleOpenEdit = (cheque: Cheque) => {
    setEditingCheque(cheque);
    setChequeForm({
      chequeNumber: cheque.chequeNumber,
      payee: cheque.payee,
      amount: cheque.amount.toString(),
      dueDate: toDateInputValue(new Date(cheque.dueDate)),
      issueDate: toDateInputValue(new Date(cheque.issueDate)),
      bankName: cheque.bankName || "",
      remarks: cheque.remarks || "",
    });
    setIsAddChequeOpen(true);
  };

  // Save Cheque
  const handleSaveCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(chequeForm.amount);
    if (!chequeForm.chequeNumber.trim()) {
      toast.error("Please enter a cheque number.");
      return;
    }
    if (!chequeForm.payee.trim()) {
      toast.error("Please enter to whom this cheque is issued (Payee).");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!chequeForm.dueDate) {
      toast.error("Please select a due date.");
      return;
    }

    try {
      if (editingCheque) {
        await updateChequeMutation.mutateAsync({
          id: editingCheque.id,
          data: {
            chequeNumber: chequeForm.chequeNumber.trim(),
            payee: chequeForm.payee.trim(),
            amount: amountNum,
            dueDate: new Date(chequeForm.dueDate).toISOString(),
            issueDate: chequeForm.issueDate ? new Date(chequeForm.issueDate).toISOString() : null,
            bankName: chequeForm.bankName.trim() || null,
            remarks: chequeForm.remarks.trim() || null,
            status: editingCheque.status,
          },
        });
        toast.success(`Cheque #${chequeForm.chequeNumber} updated successfully.`);
      } else {
        await createChequeMutation.mutateAsync({
          chequeNumber: chequeForm.chequeNumber.trim(),
          payee: chequeForm.payee.trim(),
          amount: amountNum,
          dueDate: new Date(chequeForm.dueDate).toISOString(),
          issueDate: chequeForm.issueDate ? new Date(chequeForm.issueDate).toISOString() : null,
          bankName: chequeForm.bankName.trim() || null,
          remarks: chequeForm.remarks.trim() || null,
        });
        toast.success(`Cheque #${chequeForm.chequeNumber} created successfully.`);
      }
      setIsAddChequeOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save cheque.");
    }
  };

  // Status changes
  const handleStatusChange = async (cheque: Cheque, newStatus: ChequeStatus) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: cheque.id,
        status: newStatus,
      });
      toast.success(`Cheque #${cheque.chequeNumber} marked as ${ChequeStatusLabels[newStatus]}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  // Delete Cheque
  const handleDeleteCheque = async () => {
    if (!deleteChequeId) return;
    try {
      await deleteChequeMutation.mutateAsync(deleteChequeId);
      toast.success("Cheque deleted.");
      setDeleteChequeId(null);
    } catch {
      toast.error("Failed to delete cheque.");
    }
  };

  // Send Due Reminders Now
  const handleSendDueRemindersNow = async (forceAll: boolean = false) => {
    try {
      toast.loading("Sending due cheque WhatsApp reminders...", { id: "reminders-dispatch" });
      const result = await sendDueRemindersMutation.mutateAsync(forceAll);
      toast.dismiss("reminders-dispatch");
      if (result.success) {
        toast.success(result.message || "WhatsApp reminders sent successfully!");
      } else {
        toast.warning(result.message || "No reminders could be sent.", {
          description: result.errors?.join(", "),
        });
      }
    } catch (err: any) {
      toast.dismiss("reminders-dispatch");
      toast.error("Error triggering WhatsApp dispatch: " + (err.response?.data?.message || err.message));
    }
  };

  // Recipient Handlers
  const handleOpenAddRecipient = () => {
    setEditingRecipient(null);
    setRecipientForm({ name: "", phoneNumber: "", isActive: true, notes: "" });
    setIsRecipientModalOpen(true);
  };

  const handleOpenEditRecipient = (r: ChequeNotificationRecipient) => {
    setEditingRecipient(r);
    setRecipientForm({
      name: r.name,
      phoneNumber: r.phoneNumber,
      isActive: r.isActive,
      notes: r.notes || "",
    });
    setIsRecipientModalOpen(true);
  };

  const handleSaveRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientForm.name.trim() || !recipientForm.phoneNumber.trim()) {
      toast.error("Please enter a name and WhatsApp phone number.");
      return;
    }

    try {
      if (editingRecipient) {
        await updateRecipientMutation.mutateAsync({
          id: editingRecipient.id,
          data: {
            name: recipientForm.name.trim(),
            phoneNumber: recipientForm.phoneNumber.trim(),
            isActive: recipientForm.isActive,
            notes: recipientForm.notes.trim() || null,
          },
        });
        toast.success("Recipient updated.");
      } else {
        await createRecipientMutation.mutateAsync({
          name: recipientForm.name.trim(),
          phoneNumber: recipientForm.phoneNumber.trim(),
          isActive: recipientForm.isActive,
          notes: recipientForm.notes.trim() || null,
        });
        toast.success("WhatsApp recipient added.");
      }
      setIsRecipientModalOpen(false);
    } catch {
      toast.error("Failed to save recipient.");
    }
  };

  const handleDeleteRecipient = async () => {
    if (!deleteRecipientId) return;
    try {
      await deleteRecipientMutation.mutateAsync(deleteRecipientId);
      toast.success("Recipient removed.");
      setDeleteRecipientId(null);
    } catch {
      toast.error("Failed to delete recipient.");
    }
  };

  // Save WhatsApp Provider Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;

    try {
      await updateSettingsMutation.mutateAsync({
        isEnabled: settingsForm.isEnabled,
        provider: settingsForm.provider,
        twilioAccountSid: settingsForm.twilioAccountSid || null,
        twilioAuthToken: settingsForm.twilioAuthToken || null,
        twilioFromNumber: settingsForm.twilioFromNumber || null,
        ultraMsgInstanceId: settingsForm.ultraMsgInstanceId || null,
        ultraMsgToken: settingsForm.ultraMsgToken || null,
        scheduledHour: settingsForm.scheduledHour,
        scheduledMinute: settingsForm.scheduledMinute,
        timeZoneId: settingsForm.timeZoneId,
      });
      toast.success("WhatsApp configuration saved successfully.");
    } catch {
      toast.error("Failed to save WhatsApp settings.");
    }
  };

  // Send Test Message
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhoneNumber.trim()) {
      toast.error("Please enter a recipient phone number.");
      return;
    }

    try {
      toast.loading("Sending test WhatsApp message...", { id: "test-wa" });
      const res = await testWhatsAppMutation.mutateAsync({
        phoneNumber: testPhoneNumber.trim(),
        message: testMessage.trim() || undefined,
      });
      toast.dismiss("test-wa");
      if (res.success) {
        toast.success(res.message);
        setIsTestWhatsAppOpen(false);
      } else {
        toast.error(res.message || "Failed to send test message.", {
          description: res.errors?.join(", "),
        });
      }
    } catch (err: any) {
      toast.dismiss("test-wa");
      toast.error("Failed to send test message: " + (err.response?.data?.message || err.message));
    }
  };

  // Helper for due date badge
  const getDueBadge = (dueDateStr: string, status: ChequeStatus) => {
    if (status !== ChequeStatus.Pending) return null;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    const diffDays = Math.round((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <Badge variant="destructive" className="gap-1 animate-pulse">
          <AlertTriangle className="size-3" />
          Overdue by {Math.abs(diffDays)}d
        </Badge>
      );
    }
    if (diffDays === 0) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 animate-bounce">
          <Clock className="size-3" />
          Due Today!
        </Badge>
      );
    }
    if (diffDays <= 7) {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
          Due in {diffDays}d
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Cheque Management"
        description={`Add cheques, track due dates, manage WhatsApp recipients, and trigger daily ${formattedScheduleTime} notifications.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSendDueRemindersNow(false)}
              disabled={sendDueRemindersMutation.isPending}
              className="gap-2 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
            >
              <Send className="size-4" />
              {sendDueRemindersMutation.isPending ? "Sending Reminders..." : "Send Today's Reminders Now"}
            </Button>
            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="size-4" />
              Add Cheque
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Cheques"
          value={isSummaryLoading ? "..." : (summary?.totalPendingCount ?? 0).toString()}
          hint={summary ? formatCurrency(summary.totalPendingAmount) : "Rs. 0.00"}
          icon={CreditCard}
          tone="default"
        />
        <StatCard
          label={`Due Today (${formattedScheduleTime} Alert)`}
          value={isSummaryLoading ? "..." : (summary?.dueTodayCount ?? 0).toString()}
          hint={summary ? formatCurrency(summary.dueTodayAmount) : "Rs. 0.00"}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Overdue Cheques"
          value={isSummaryLoading ? "..." : (summary?.overdueCount ?? 0).toString()}
          hint={summary ? formatCurrency(summary.overdueAmount) : "Rs. 0.00"}
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="Cleared Cheques"
          value={isSummaryLoading ? "..." : (summary?.clearedCount ?? 0).toString()}
          hint={summary ? formatCurrency(summary.clearedAmount) : "Rs. 0.00"}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "cheques" | "whatsapp")} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="cheques" className="gap-2">
            <CreditCard className="size-4" />
            Cheques Registry
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <Bell className="size-4" />
            WhatsApp & Alert Settings
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CHEQUES LIST */}
        <TabsContent value="cheques" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Cheque Registry</CardTitle>
                  <CardDescription>
                    All issued cheques with due date tracking and status management.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetchCheques()}
                    title="Refresh data"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cheque #, payee, bank, notes..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Dropdown */}
                  <Select
                    value={statusFilter}
                    onValueChange={(val) => {
                      if (val) {
                        setStatusFilter(val);
                        setPage(1);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value={ChequeStatus.Pending.toString()}>Pending</SelectItem>
                      <SelectItem value={ChequeStatus.Cleared.toString()}>Cleared</SelectItem>
                      <SelectItem value={ChequeStatus.Bounced.toString()}>Bounced</SelectItem>
                      <SelectItem value={ChequeStatus.Cancelled.toString()}>Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Due Date Presets */}
                  <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setDueFilter("all");
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        dueFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDueFilter("due_today");
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        dueFilter === "due_today" ? "bg-amber-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Due Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDueFilter("due_week");
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        dueFilter === "due_week" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Next 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDueFilter("overdue");
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        dueFilter === "overdue" ? "bg-destructive text-destructive-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Overdue
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {isChequesLoading ? (
                <div className="space-y-3 py-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !chequesData || chequesData.items.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No cheques found"
                  description={
                    search || statusFilter !== "all" || dueFilter !== "all"
                      ? "Try adjusting your search criteria or filter options."
                      : "Start by recording issued cheques to enable automated WhatsApp alerts on due dates."
                  }
                  action={
                    <Button onClick={handleOpenAdd} className="gap-2">
                      <Plus className="size-4" />
                      Add Cheque
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cheque #</TableHead>
                        <TableHead>Issued To (Payee)</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>WhatsApp Alert</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chequesData.items.map((cheque) => {
                        const dueBadge = getDueBadge(cheque.dueDate, cheque.status);
                        return (
                          <TableRow key={cheque.id} className="hover:bg-muted/50">
                            {/* Cheque Number */}
                            <TableCell className="font-semibold">
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted border">
                                {cheque.chequeNumber}
                              </span>
                            </TableCell>

                            {/* Payee */}
                            <TableCell>
                              <div className="font-medium">{cheque.payee}</div>
                              {cheque.remarks && (
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={cheque.remarks}>
                                  {cheque.remarks}
                                </div>
                              )}
                            </TableCell>

                            {/* Bank Name */}
                            <TableCell className="text-muted-foreground text-sm">
                              {cheque.bankName || "—"}
                            </TableCell>

                            {/* Due Date */}
                            <TableCell>
                              <div className="flex flex-col gap-1 items-start">
                                <span className="font-medium text-sm">
                                  {formatDateOnly(cheque.dueDate)}
                                </span>
                                {dueBadge}
                              </div>
                            </TableCell>

                            {/* Amount */}
                            <TableCell className="text-right font-mono font-semibold text-base">
                              {formatCurrency(cheque.amount)}
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              {cheque.status === ChequeStatus.Pending && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/20 dark:text-amber-400">
                                  Pending
                                </Badge>
                              )}
                              {cheque.status === ChequeStatus.Cleared && (
                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                  Cleared
                                </Badge>
                              )}
                              {cheque.status === ChequeStatus.Bounced && (
                                <Badge variant="destructive">
                                  Bounced
                                </Badge>
                              )}
                              {cheque.status === ChequeStatus.Cancelled && (
                                <Badge variant="secondary" className="text-muted-foreground">
                                  Cancelled
                                </Badge>
                              )}
                            </TableCell>

                            {/* WhatsApp Alert Status */}
                            <TableCell>
                              {cheque.status !== ChequeStatus.Pending ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : cheque.isReminderSent ? (
                                <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 gap-1">
                                  <Check className="size-3" />
                                  Sent
                                </Badge>
                              ) : waSettings?.isEnabled === false ? (
                                <span className="text-xs text-muted-foreground">
                                  Disabled
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Scheduled for {formattedScheduleTime}
                                </span>
                              )}
                            </TableCell>

                            {/* Actions Menu */}
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={<Button variant="ghost" size="icon" className="size-8" />}
                                >
                                  <MoreVertical className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem onClick={() => handleOpenEdit(cheque)}>
                                    <Pencil className="size-4 mr-2" />
                                    Edit Details
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  {cheque.status === ChequeStatus.Pending && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleStatusChange(cheque, ChequeStatus.Cleared)}>
                                        <CheckCircle2 className="size-4 mr-2 text-emerald-600" />
                                        Mark Cleared
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStatusChange(cheque, ChequeStatus.Bounced)}>
                                        <XCircle className="size-4 mr-2 text-rose-600" />
                                        Mark Bounced
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStatusChange(cheque, ChequeStatus.Cancelled)}>
                                        <AlertTriangle className="size-4 mr-2 text-amber-600" />
                                        Cancel Cheque
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  {cheque.status !== ChequeStatus.Pending && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(cheque, ChequeStatus.Pending)}>
                                      <Clock className="size-4 mr-2 text-blue-600" />
                                      Reset to Pending
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteChequeId(cheque.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="size-4 mr-2" />
                                    Delete Cheque
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {chequesData && chequesData.totalPages > 1 && (
                <div className="mt-4">
                  <PaginationBar
                    page={chequesData.page}
                    totalPages={chequesData.totalPages}
                    totalCount={chequesData.totalCount}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: WHATSAPP SETTINGS & RECIPIENTS */}
        <TabsContent value="whatsapp" className="space-y-6">
          {/* Banner: Daily Scheduled Info with dynamic AM/PM time */}
          <Card className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-primary/10 border-emerald-500/30">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base">
                      Automatic Daily WhatsApp Due Cheque Alert ({formattedScheduleTime})
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Every day at <strong>{formattedScheduleTime} Sri Lanka Time (UTC+5:30)</strong>, the system automatically checks for all pending cheques due on that day and sends a formatted alert to all active registered WhatsApp numbers below.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => handleSendDueRemindersNow(true)}
                    disabled={sendDueRemindersMutation.isPending}
                    variant="outline"
                    className="gap-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <Send className="size-4" />
                    {sendDueRemindersMutation.isPending ? "Dispatching..." : "Send Reminders Now (Test Run)"}
                  </Button>
                  <Button
                    onClick={() => {
                      setTestPhoneNumber(recipients?.[0]?.phoneNumber || "+94");
                      setIsTestWhatsAppOpen(true);
                    }}
                    variant="secondary"
                    className="gap-2"
                  >
                    <Phone className="size-4" />
                    Send Test Ping
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SECTION 1: RECIPIENT PHONE NUMBERS */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="size-5 text-primary" />
                    WhatsApp Recipients
                  </CardTitle>
                  <CardDescription>
                    Add more WhatsApp numbers to receive due cheque morning notifications.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleOpenAddRecipient} className="gap-1.5">
                  <Plus className="size-3.5" />
                  Add Number
                </Button>
              </CardHeader>
              <CardContent>
                {isRecipientsLoading ? (
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : !recipients || recipients.length === 0 ? (
                  <div className="text-center py-8 px-4 border rounded-lg border-dashed">
                    <Phone className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="font-medium text-sm">No WhatsApp numbers configured</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Click &quot;Add Number&quot; above to register the phone numbers that should receive due cheque reminders.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{recipient.name}</span>
                            {recipient.isActive ? (
                              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-xs">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                            <Phone className="size-3 text-emerald-600" />
                            {recipient.phoneNumber}
                          </p>
                          {recipient.notes && (
                            <p className="text-xs text-muted-foreground">{recipient.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              setTestPhoneNumber(recipient.phoneNumber);
                              setIsTestWhatsAppOpen(true);
                            }}
                            title="Send Test Ping to this number"
                          >
                            <Send className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleOpenEditRecipient(recipient)}
                            title="Edit"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            onClick={() => setDeleteRecipientId(recipient.id)}
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SECTION 2: NOTIFICATION SCHEDULE */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="size-5 text-primary" />
                  Alert Schedule Settings
                </CardTitle>
                <CardDescription>
                  Configure automated dispatch schedule and time for due cheque notifications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSettingsLoading || !settingsForm ? (
                  <div className="space-y-3 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div>
                        <Label className="font-semibold text-sm">Enable WhatsApp Notifications</Label>
                        <p className="text-xs text-muted-foreground">
                          Turn on or off automatic and manual WhatsApp messages.
                        </p>
                      </div>
                      <Switch
                        checked={settingsForm.isEnabled}
                        onCheckedChange={(checked) =>
                          setSettingsForm((prev) => (prev ? { ...prev, isEnabled: checked } : null))
                        }
                      />
                    </div>

                    {/* Schedule Time Settings with 12-Hour & AM/PM Selector */}
                    <div className="space-y-2 p-3.5 rounded-lg border bg-card">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Daily Alert Schedule Time</Label>
                        <Badge variant="outline" className="font-mono text-xs font-bold bg-primary/10 text-primary border-primary/20">
                          {formattedScheduleTime}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {/* Hour (1 - 12) */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Hour
                          </span>
                          <Select
                            value={hour12}
                            onValueChange={(val) => {
                              if (val) {
                                handleTimeChange(parseInt(val, 10), scheduledMinute, period as "AM" | "PM");
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                <SelectItem key={h} value={h.toString()}>
                                  {h.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Minute (00 - 55) */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Minute
                          </span>
                          <Select
                            value={minuteStr}
                            onValueChange={(val) => {
                              if (val) {
                                handleTimeChange(parseInt(hour12, 10), parseInt(val, 10), period as "AM" | "PM");
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent>
                              {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                                <SelectItem key={m} value={m}>
                                  :{m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* AM / PM Selector */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                            AM / PM
                          </span>
                          <Select
                            value={period}
                            onValueChange={(val) => {
                              if (val) {
                                handleTimeChange(parseInt(hour12, 10), scheduledMinute, val as "AM" | "PM");
                              }
                            }}
                          >
                            <SelectTrigger className="font-semibold text-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM" className="font-semibold">
                                AM (Morning)
                              </SelectItem>
                              <SelectItem value="PM" className="font-semibold">
                                PM (Evening)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground pt-1">
                        Select any hour and <strong>AM or PM</strong>. The system will dispatch due cheque reminders at this exact time every day.
                      </p>
                    </div>

                    {/* Time Zone */}
                    <div className="space-y-1">
                      <Label htmlFor="tz" className="text-xs font-semibold">
                        Time Zone
                      </Label>
                      <Input
                        id="tz"
                        disabled
                        value="Sri Lanka (UTC+05:30)"
                        className="bg-muted text-muted-foreground text-xs"
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                        className="w-full"
                      >
                        {updateSettingsMutation.isPending ? "Saving..." : "Save Schedule Settings"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ============================================================
          MODALS & DIALOGS
         ============================================================ */}

      {/* 1. ADD / EDIT CHEQUE DIALOG */}
      <Dialog open={isAddChequeOpen} onOpenChange={setIsAddChequeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCheque ? `Edit Cheque #${editingCheque.chequeNumber}` : "Add New Cheque"}
            </DialogTitle>
            <DialogDescription>
              Record the cheque details. An alert will be dispatched on the morning of the due date.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCheque} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label htmlFor="chequeNumber">Cheque Number *</Label>
              <Input
                id="chequeNumber"
                placeholder="e.g. CHQ-829104"
                value={chequeForm.chequeNumber}
                onChange={(e) => setChequeForm({ ...chequeForm, chequeNumber: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="payee">To Whom Issued (Payee) *</Label>
              <Input
                id="payee"
                placeholder="e.g. Unilever PLC / Distributor Name"
                value={chequeForm.payee}
                onChange={(e) => setChequeForm({ ...chequeForm, payee: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="amount">Amount (Rs.) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={chequeForm.amount}
                  onChange={(e) => setChequeForm({ ...chequeForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  placeholder="e.g. Commercial Bank"
                  value={chequeForm.bankName}
                  onChange={(e) => setChequeForm({ ...chequeForm, bankName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={chequeForm.dueDate}
                  onChange={(e) => setChequeForm({ ...chequeForm, dueDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={chequeForm.issueDate}
                  onChange={(e) => setChequeForm({ ...chequeForm, issueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="remarks">Purpose / Notes</Label>
              <Textarea
                id="remarks"
                rows={2}
                placeholder="e.g. Toothpaste, soap, invoice reference..."
                value={chequeForm.remarks}
                onChange={(e) => setChequeForm({ ...chequeForm, remarks: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsAddChequeOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createChequeMutation.isPending || updateChequeMutation.isPending}
              >
                {createChequeMutation.isPending || updateChequeMutation.isPending
                  ? "Saving..."
                  : editingCheque
                  ? "Save Changes"
                  : "Add Cheque"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. CONFIRM DELETE CHEQUE */}
      <ConfirmDialog
        open={!!deleteChequeId}
        onOpenChange={(open) => !open && setDeleteChequeId(null)}
        title="Delete Cheque"
        description="Are you sure you want to delete this cheque record? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteCheque}
      />

      {/* 3. ADD / EDIT RECIPIENT MODAL */}
      <Dialog open={isRecipientModalOpen} onOpenChange={setIsRecipientModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRecipient ? "Edit WhatsApp Recipient" : "Add WhatsApp Recipient"}
            </DialogTitle>
            <DialogDescription>
              Register a phone number to receive automatic daily {formattedScheduleTime} due cheque notifications.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRecipient} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label htmlFor="recName">Recipient Name *</Label>
              <Input
                id="recName"
                placeholder="e.g. Managing Director / Mr. Santhrima"
                value={recipientForm.name}
                onChange={(e) => setRecipientForm({ ...recipientForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="recPhone">WhatsApp Phone Number *</Label>
              <Input
                id="recPhone"
                placeholder="+94771234567 or 0771234567"
                value={recipientForm.phoneNumber}
                onChange={(e) => setRecipientForm({ ...recipientForm, phoneNumber: e.target.value })}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Include country code (e.g. <code>+94</code> for Sri Lanka).
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="recNotes">Role / Notes</Label>
              <Input
                id="recNotes"
                placeholder="e.g. Primary Account Holder"
                value={recipientForm.notes}
                onChange={(e) => setRecipientForm({ ...recipientForm, notes: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label className="font-semibold text-sm">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Receive notifications when enabled.
                </p>
              </div>
              <Switch
                checked={recipientForm.isActive}
                onCheckedChange={(checked) =>
                  setRecipientForm({ ...recipientForm, isActive: checked })
                }
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsRecipientModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRecipientMutation.isPending || updateRecipientMutation.isPending}
              >
                {createRecipientMutation.isPending || updateRecipientMutation.isPending
                  ? "Saving..."
                  : editingRecipient
                  ? "Update Number"
                  : "Save Recipient"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. CONFIRM DELETE RECIPIENT */}
      <ConfirmDialog
        open={!!deleteRecipientId}
        onOpenChange={(open) => !open && setDeleteRecipientId(null)}
        title="Remove Recipient"
        description="Are you sure you want to remove this phone number from receiving WhatsApp cheque reminders?"
        confirmLabel="Remove"
        destructive
        onConfirm={handleDeleteRecipient}
      />

      {/* 5. TEST WHATSAPP PING DIALOG */}
      <Dialog open={isTestWhatsAppOpen} onOpenChange={setIsTestWhatsAppOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test WhatsApp Message</DialogTitle>
            <DialogDescription>
              Dispatch a test message to verify that your WhatsApp API credentials and phone number can receive messages.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendTestMessage} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label htmlFor="testPhone">Target Phone Number *</Label>
              <Input
                id="testPhone"
                placeholder="+94771234567"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="testBody">Custom Message (Optional)</Label>
              <Textarea
                id="testBody"
                rows={3}
                placeholder="Leave blank for standard test message..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsTestWhatsAppOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={testWhatsAppMutation.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className="size-4" />
                {testWhatsAppMutation.isPending ? "Sending..." : "Dispatch Test Ping"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
