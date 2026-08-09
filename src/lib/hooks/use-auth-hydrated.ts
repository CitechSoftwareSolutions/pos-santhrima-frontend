import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist?.hasHydrated() ?? false);

  useEffect(() => {
    return useAuthStore.persist?.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
