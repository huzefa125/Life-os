"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, ApiError } from "@/lib/api-client";
import { clearToken, getToken, setToken } from "@/lib/auth-storage";
import type { ApiUser } from "@/lib/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: ApiUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const token = getToken();

    if (!token) {
      queueMicrotask(() => {
        if (!cancelled) setStatus("unauthenticated");
      });
      return () => {
        cancelled = true;
      };
    }

    api.auth
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        clearToken();
        if (!cancelled) setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, user: loggedInUser } = await api.auth.login({ email, password });
      setToken(token);
      setUser(loggedInUser);
      setStatus("authenticated");
      router.push("/people");
    },
    [router]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await api.auth.register({ name, email, password });
      await login(email, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("unauthenticated");
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
