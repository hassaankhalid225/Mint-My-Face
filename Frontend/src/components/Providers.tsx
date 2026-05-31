"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus refetchInterval={5 * 60}>
      {children}
    </SessionProvider>
  );
}
