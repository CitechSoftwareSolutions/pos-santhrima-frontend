import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist?.hasHydrated()) {
      setHydrated(true);
    } else {
      return useAuthStore.persist?.onFinishHydration(() => setHydrated(true));
    }
  }, []);

  return hydrated;
}
