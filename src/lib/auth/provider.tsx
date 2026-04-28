"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { Auth0Provider, useUser } from "@auth0/nextjs-auth0";
import { clearChatHistory } from "@/components/chat/chat-widget";

type UserRole = "student" | "admin";
type GradeLevel = "K" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12";

interface AuthContextValue {
  user: { id: string; email: string; name: string; role?: UserRole; gradeLevel?: GradeLevel } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

function AuthBridge({ children }: { children: React.ReactNode }) {
  const { user: auth0User, isLoading: auth0Loading } = useUser();
  const [userMetadata, setUserMetadata] = useState<{ role?: UserRole; gradeLevel?: GradeLevel } | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);

  // Fetch user metadata (role, gradeLevel) when authenticated
  useEffect(() => {
    if (auth0User?.sub && !userMetadata) {
      setMetadataLoading(true);
      fetch("/api/user")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setUserMetadata({ role: data.role, gradeLevel: data.gradeLevel });
          }
        })
        .catch(() => {
          // Non-critical, leave as default
        })
        .finally(() => setMetadataLoading(false));
    } else if (!auth0User) {
      setUserMetadata(null);
    }
  }, [auth0User?.sub, userMetadata]);

  const user = auth0User
    ? {
        id: auth0User.sub,
        email: auth0User.email ?? "",
        name: auth0User.name ?? "",
        role: userMetadata?.role,
        gradeLevel: userMetadata?.gradeLevel,
      }
    : null;

  const isLoading = auth0Loading || metadataLoading;

  const login = () => {
    window.location.href = "/auth/login";
  };

  const logout = () => {
    clearChatHistory();
    window.location.href = "/auth/logout";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!auth0User,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 60_000,
        focusThrottleInterval: 120_000,
        revalidateOnFocus: false,
      }}
    >
      <Auth0Provider>
        <AuthBridge>{children}</AuthBridge>
      </Auth0Provider>
    </SWRConfig>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
