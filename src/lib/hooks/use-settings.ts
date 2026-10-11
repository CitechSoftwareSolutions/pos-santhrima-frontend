import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import type { UpdateStoreSettingsRequest } from "@/lib/types";

export function useStoreSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
  });
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateStoreSettingsRequest) => settingsApi.update(data),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
