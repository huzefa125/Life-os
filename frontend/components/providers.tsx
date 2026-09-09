"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider delay={200}>
        {children}
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </AuthProvider>
  );
}
