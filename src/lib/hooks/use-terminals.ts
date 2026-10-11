import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { terminalsApi } from "@/lib/api/terminals";
import type {
  CreateTerminalRequest,
  UpdateTerminalRequest,
  SetTerminalCountRequest,
  AuthorizeSwitchRequest,
} from "@/lib/types";

export function useTerminals(includeInactive = false) {
  return useQuery({
    queryKey: ["terminals", { includeInactive }],
    queryFn: () => terminalsApi.getAll(includeInactive),
  });
}

export function useTerminal(id: string | null | undefined) {
  return useQuery({
    queryKey: ["terminals", id],
    queryFn: () => (id ? terminalsApi.getById(id) : null),
    enabled: !!id,
  });
}

export function useCreateTerminal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTerminalRequest) => terminalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terminals"] });
    },
  });
}

export function useUpdateTerminal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTerminalRequest }) =>
      terminalsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terminals"] });
    },
  });
}

export function useSetTerminalCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SetTerminalCountRequest) => terminalsApi.setCount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terminals"] });
    },
  });
}

export function useDeleteTerminal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => terminalsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terminals"] });
    },
  });
}

export function useAuthorizeSwitchTerminal() {
  return useMutation({
    mutationFn: (data: AuthorizeSwitchRequest) => terminalsApi.authorizeSwitch(data),
  });
}
