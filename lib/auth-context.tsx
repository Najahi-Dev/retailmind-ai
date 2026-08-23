"use client";
"use strict";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export type Role = "super_admin" | "admin" | "manager" | "staff" | "supplier";

export interface AuthUser {
  id: string;
  _id?: string;
  email: string;
  name: string;
  role: Role;
  plan?: string;
  planTier?: string;
  subscriptionStatus?: string;
  orgId?: string;
  imageUrl?: string;
  isActive?: boolean;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (newToken: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  impersonateUser: (token: string) => void;
  exitImpersonation: () => void;
  isImpersonating: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "retailmind_token";
const IMPERSONATOR_TOKEN_KEY = "retailmind_super_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  });

  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !!sessionStorage.getItem(IMPERSONATOR_TOKEN_KEY);
    }
    return false;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const validateSessionAction = useAction(api.auth.validateSession);
  const loginUserAction = useAction(api.auth.loginUser);
  const logoutUserAction = useAction(api.auth.logoutUser);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Sync localStorage token to cookie to prevent middleware redirects on hard refresh
  useEffect(() => {
    if (typeof window !== "undefined" && token) {
      if (!document.cookie.includes(`${TOKEN_KEY}=`)) {
        document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=604800; SameSite=Lax`;
      }
    }
  }, [token]);

  // ── REAL-TIME REACTIVE SUSPENSION & SESSION WATCHER ──
  const liveUserRecord = useQuery(api.users.getCurrentUserRecord, {
    token: token ?? undefined,
  });

  useEffect(() => {
    if (!token) return;
    if (liveUserRecord !== undefined) {
      if (
        liveUserRecord === null ||
        liveUserRecord.isActive === false ||
        liveUserRecord.role === "pending"
      ) {
        // Immediate forced logout when account is suspended or invalidated by Admin
        localStorage.removeItem(TOKEN_KEY);
        document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        setToken(null);
        setCurrentUser(null);
        setIsLoading(false);
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in?suspended=true";
        }
      } else if (liveUserRecord) {
        setCurrentUser({
          id: liveUserRecord._id,
          _id: liveUserRecord._id,
          email: liveUserRecord.email,
          name: liveUserRecord.name,
          role: liveUserRecord.role as Role,
          plan: liveUserRecord.plan,
          planTier: liveUserRecord.planTier,
          subscriptionStatus: liveUserRecord.subscriptionStatus,
          orgId: liveUserRecord.orgId,
          imageUrl: liveUserRecord.imageUrl,
          isActive: liveUserRecord.isActive,
        });
      }
    }
  }, [liveUserRecord, token]);

  // Additional validation for token/session consistency
  useEffect(() => {
    if (!token) return;

    // Validate the token/session on mount and periodically
    const validateSession = async () => {
      try {
        const sessionValid = await validateSessionAction({ token });
        if (!sessionValid) {
          // Token/session is invalid, clear it
          localStorage.removeItem(TOKEN_KEY);
          document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
          setToken(null);
          setCurrentUser(null);
          setIsLoading(false);

          // Redirect to sign-in if not already there
          if (typeof window !== "undefined" && !window.location.pathname.includes('/sign-in')) {
            window.location.href = "/sign-in?session_expired=true";
          }
        }
      } catch (error) {
        console.error("Session validation error:", error);
        // On error, clear the session to be safe
        localStorage.removeItem(TOKEN_KEY);
        document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        setToken(null);
        setCurrentUser(null);
        setIsLoading(false);
      }
    };

    validateSession();

    // Set up periodic validation (every 5 minutes)
    const intervalId = setInterval(validateSession, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [token, validateSessionAction]);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const sessionUser = await validateSessionAction({ token });
      if (sessionUser) {
        setCurrentUser((prev) => ({
          ...(prev || {}),
          id: sessionUser.id,
          _id: sessionUser._id,
          email: sessionUser.email,
          name: sessionUser.name,
          role: sessionUser.role as Role,
          imageUrl: sessionUser.imageUrl,
          isActive: sessionUser.isActive,
        }));
      }
    } catch (err) {
      console.error("Failed to refresh session user", err);
    }
  };

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
          setCurrentUser((prev) => ({
            ...(prev || {}),
            id: sessionUser.id,
            _id: sessionUser._id,
            email: sessionUser.email,
            name: sessionUser.name,
            role: sessionUser.role as Role,
            imageUrl: sessionUser.imageUrl,
            isActive: sessionUser.isActive,
          }));
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
        window.location.href = "/";
      }
    }
  };

  const loginWithToken = (newToken: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    document.cookie = `${TOKEN_KEY}=${newToken}; path=/; max-age=604800; SameSite=Lax`;
    setToken(newToken);
    setCurrentUser(user);
  };

  const impersonateUser = (impersonationToken: string) => {
    if (!token) return;
    // Save current super admin token to session storage
    sessionStorage.setItem(IMPERSONATOR_TOKEN_KEY, token);
    setIsImpersonating(true);
    // Overwrite standard token
    localStorage.setItem(TOKEN_KEY, impersonationToken);
    document.cookie = `${TOKEN_KEY}=${impersonationToken}; path=/; max-age=604800; SameSite=Lax`;
    setToken(impersonationToken);
    // User will be refreshed via useEffect
  };

  const exitImpersonation = () => {
    const originalToken = sessionStorage.getItem(IMPERSONATOR_TOKEN_KEY);
    if (originalToken) {
      sessionStorage.removeItem(IMPERSONATOR_TOKEN_KEY);
      setIsImpersonating(false);
      localStorage.setItem(TOKEN_KEY, originalToken);
      document.cookie = `${TOKEN_KEY}=${originalToken}; path=/; max-age=604800; SameSite=Lax`;
      setToken(originalToken);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: currentUser,
        token,
        login,
        loginWithToken,
        logout,
        refreshUser,
        impersonateUser,
        exitImpersonation,
        isImpersonating,
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
  // During SSR prerender, AuthContext is undefined (AuthProvider is client-only).
  // Return a safe no-op default so the server render doesn't crash.
  if (!context) {
    return {
      currentUser: null,
      user: null,
      token: null,
      login: async () => {},
      loginWithToken: () => {},
      logout: async () => {},
      refreshUser: async () => {},
      impersonateUser: () => {},
      exitImpersonation: () => {},
      isImpersonating: false,
      isLoading: true,
      isAuthenticated: false,
    } satisfies AuthContextType;
  }
  return context;
}

export function useRole() {
  const { currentUser, isLoading } = useAuth();
  const role = currentUser?.role ?? "staff";

  const isSuperAdmin = role === "super_admin" || currentUser?.email === "admin@retailmind.com" || currentUser?.email === "ahmednajahi2003@gmail.com";
  const isAdmin = role === "admin" || isSuperAdmin;
  const isManager = role === "manager" || isAdmin;
  const isStaff = role === "staff" || isManager;
  const isSupplier = role === "supplier";

  const canViewFinancials = isAdmin || isManager;
  const canApproveReorders = isAdmin || isManager;
  const canManageUsers = isAdmin || isManager;

  const workspacePlan = currentUser?.plan || "starter";
  const planTier = currentUser?.planTier || (currentUser?.plan ? currentUser.plan.toUpperCase() : "STARTER");
  const subscriptionStatus = currentUser?.subscriptionStatus || "FREE";
  const rawStatus = subscriptionStatus.toUpperCase();
  const isSubscribed = ["ACTIVE", "TRIALING", "TRIAL"].includes(rawStatus);

  const hasGrowthAccess = (planTier === "GROWTH" || planTier === "ENTERPRISE") && isSubscribed;
  const hasEnterpriseAccess = planTier === "ENTERPRISE" && isSubscribed;

  return {
    user: currentUser,
    role,
    isLoading,
    isSuperAdmin,
    isAdmin,
    isManager,
    isStaff,
    isSupplier,
    canViewFinancials,
    canApproveReorders,
    canManageUsers,
    workspacePlan,
    planTier,
    subscriptionStatus,
    isSubscribed,
    hasGrowthAccess,
    hasEnterpriseAccess,
  };
}
