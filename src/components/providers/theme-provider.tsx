"use client";

import type { ReactNode } from "react";

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
  [key: string]: any;
}) {
  return <>{children}</>;
}
