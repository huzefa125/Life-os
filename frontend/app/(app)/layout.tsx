"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { PageLoader } from "@/components/ui/loader";
import { useAuth } from "@/contexts/auth-context";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return <PageLoader fullScreen label="Loading LifeOS" />;
  }

  return <AppShell>{children}</AppShell>;
}
