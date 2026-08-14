"use client";
"use strict";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export type Role = "admin" | "manager" | "staff" | "supplier";

export interface AuthUser {
  id: string;
  _id?: string;
  email: string;
  name: string;
  role: Role;
  plan?: string;
  imageUrl?: string;
  isActive?: boolean;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "retailmind_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const validateSessionAction = useAction(api.auth.validateSession);
  const loginUserAction = useAction(api.auth.loginUser);
  const logoutUserAction = useAction(api.auth.logoutUser);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!token) {
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    validateSessionAction({ token })
      .then((sessionUser) => {
        if (!isMounted) return;
        if (!sessionUser) {
          localStorage.removeItem(TOKEN_KEY);
          document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
          setToken(null);
          setCurrentUser(null);
        } else {
          setCurrentUser({
            id: sessionUser.id,
            _id: sessionUser._id,
            email: sessionUser.email,
            name: sessionUser.name,
            role: sessionUser.role as Role,
            plan: sessionUser.plan,
            imageUrl: sessionUser.imageUrl,
            isActive: sessionUser.isActive,
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setCurrentUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, validateSessionAction]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await loginUserAction({ email, password });
      if (res && res.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
        document.cookie = `${TOKEN_KEY}=${res.token}; path=/; max-age=604800; SameSite=Lax`;
        setToken(res.token);
        setCurrentUser({
          id: res.userId,
          _id: res.userId,
          email: res.email,
          name: res.name,
          role: res.role as Role,
          imageUrl: res.imageUrl,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (token) {
        await logoutUserAction({ token }).catch(() => {});
      }
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      setToken(null);
      setCurrentUser(null);
      setIsLoading(false);
      if (typeof window !== "undefined") {
        window.location.href = "/sign-in";
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: currentUser,
        token,
        login,
        logout,
        isLoading,
        isAuthenticated: !!currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRole() {
  const { currentUser, isLoading } = useAuth();
  const role = currentUser?.role ?? "staff";

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isStaff = role === "staff";
  const isSupplier = role === "supplier";

  const canViewFinancials = isAdmin || isManager;
  const canApproveReorders = isAdmin || isManager;
  const canManageUsers = isAdmin || isManager;

  return {
    user: currentUser,
    role,
    isLoading,
    isAdmin,
    isManager,
    isStaff,
    isSupplier,
    canViewFinancials,
    canApproveReorders,
    canManageUsers,
  };
}
