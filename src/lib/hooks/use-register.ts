import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { registerApi } from "@/lib/api/register";
import type { OpenRegisterRequest, CloseRegisterRequest } from "@/lib/types";

export function useCurrentRegister(terminalId: string | null | undefined) {
  return useQuery({
    queryKey: ["registers", "current", terminalId],
    queryFn: () => (terminalId ? registerApi.getCurrent(terminalId) : null),
    enabled: !!terminalId,
    refetchInterval: 15000,
  });
}

export function useOpenRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OpenRegisterRequest) => registerApi.open(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["registers", "current", variables.terminalId] });
    },
  });
}

export function useCloseRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CloseRegisterRequest) => registerApi.close(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["registers", "current", variables.terminalId] });
      queryClient.invalidateQueries({ queryKey: ["registers", "today-summary", variables.terminalId] });
    },
  });
}

export function useTodayCounterSummary(terminalId: string | null | undefined) {
  return useQuery({
    queryKey: ["registers", "today-summary", terminalId],
    queryFn: () => (terminalId ? registerApi.getTodaySummary(terminalId) : null),
    enabled: !!terminalId,
  });
}
