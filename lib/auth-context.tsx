"use client";
// lib/auth-context.tsx
//
// Client auth state.
//  • Access token  – short-lived (15 min) JWT, kept in memory and mirrored in a
//    non-HttpOnly cookie so server components/proxy can read it. Passed to Convex
//    functions as the `token` argument.
//  • Refresh token – HttpOnly cookie, never readable by JavaScript. Exchanged via
//    POST /api/auth/refresh (rotating) shortly before the access token expires.
//  • Impersonation – a separate 1h, non-refreshable access token kept in
//    sessionStorage; the super admin's own refresh cookie is untouched.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
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

const ACCESS_COOKIE = "retailmind_token";
const IMPERSONATION_KEY = "retailmind_impersonation_token";
const LEGACY_KEYS = ["retailmind_token", "retailmind_super_token"];
const REFRESH_LEEWAY_MS = 60 * 1000;

type SessionPayload = {
  accessToken: string;
  accessTokenExpiresAt: number;
  user: { _id: string; email: string; name: string; role: string; orgId?: string; imageUrl?: string };
};

class AuthRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/** Reads `exp` from a JWT WITHOUT verifying it — used only for scheduling refreshes. */
function tokenExpiry(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isFresh(token: string | null) {
  const exp = tokenExpiry(token);
  return !!exp && exp - Date.now() > REFRESH_LEEWAY_MS;
}

async function postAuth(path: string, body?: unknown): Promise<any> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AuthRequestError(data?.error || "Request failed", res.status);
  return data;
}

function toAuthUser(u: SessionPayload["user"]): AuthUser {
  return {
    id: u._id,
    _id: u._id,
    email: u.email,
    name: u.name,
    role: u.role as Role,
    orgId: u.orgId,
    imageUrl: u.imageUrl,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [impersonationToken, setImpersonationToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const t = sessionStorage.getItem(IMPERSONATION_KEY);
    return t && isFresh(t) ? t : null;
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    const t = readCookie(ACCESS_COOKIE);
    return t && isFresh(t) ? t : null;
  });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const isImpersonating = !!impersonationToken;
  const token = impersonationToken ?? accessToken;

  // Remove tokens stored by the previous (localStorage-based) implementation.
  useEffect(() => {
    try {
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
      sessionStorage.removeItem("retailmind_super_token");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setCurrentUser(null);
    setImpersonationToken(null);
    try {
      sessionStorage.removeItem(IMPERSONATION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /** Rotates the refresh cookie and returns a new access token (deduplicated). */
  const refresh = useCallback(async (): Promise<string | null> => {
    if (!refreshInFlight.current) {
      refreshInFlight.current = (async () => {
        try {
          const data: SessionPayload = await postAuth("/api/auth/refresh");
          setAccessToken(data.accessToken);
          setCurrentUser((prev) => ({ ...(prev ?? {}), ...toAuthUser(data.user) }));
          return data.accessToken;
        } catch (err) {
          if (err instanceof AuthRequestError && err.status === 401) {
            setAccessToken(null);
            setCurrentUser(null);
          }
          return null;
        } finally {
          refreshInFlight.current = null;
        }
      })();
    }
    return refreshInFlight.current;
  }, []);

  // Bootstrap: obtain an access token if the cookie one is missing or about to expire.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isFresh(accessToken)) await refresh();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Proactively refresh shortly before the access token expires.
  useEffect(() => {
    if (!accessToken) return;
    const exp = tokenExpiry(accessToken);
    if (!exp) return;
    const delay = Math.max(5_000, exp - Date.now() - REFRESH_LEEWAY_MS);
    const id = setTimeout(() => void refresh(), delay);
    return () => clearTimeout(id);
  }, [accessToken, refresh]);

  // Refresh when the tab becomes visible again (timers are throttled in background tabs).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && accessToken && !isFresh(accessToken)) {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [accessToken, refresh]);

  // Impersonation tokens are not refreshable: drop back to the admin session on expiry.
  useEffect(() => {
    if (!impersonationToken) return;
    const exp = tokenExpiry(impersonationToken);
    const id = setTimeout(() => {
      try {
        sessionStorage.removeItem(IMPERSONATION_KEY);
      } catch {
        /* ignore */
      }
      setImpersonationToken(null);
    }, Math.max(0, (exp ?? 0) - Date.now()));
    return () => clearTimeout(id);
  }, [impersonationToken]);

  // ── Live user record: reacts instantly to suspension / role change / revocation ──
  const liveUserRecord = useQuery(api.users.getCurrentUserRecord, token ? { token } : "skip");

  useEffect(() => {
    if (!token || liveUserRecord === undefined) return;

    if (liveUserRecord === null) {
      if (isImpersonating) {
        try {
          sessionStorage.removeItem(IMPERSONATION_KEY);
        } catch {
          /* ignore */
        }
        setImpersonationToken(null);
        return;
      }
      // Token rejected: may simply have expired (e.g. after sleep). Try one refresh first.
      void refresh().then((newToken) => {
        if (!newToken) {
          clearSession();
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/sign-in")) {
            window.location.href = "/sign-in?session_expired=true";
          }
        }
      });
      return;
    }

    const isSuspended =
      liveUserRecord.role !== "super_admin" &&
      (liveUserRecord.isActive === false ||
        liveUserRecord.role === "pending" ||
        (liveUserRecord.subscriptionStatus || "").toUpperCase() === "CANCELED");

    if (isSuspended) {
      void postAuth("/api/auth/logout").catch(() => {});
      clearSession();
      window.location.href = "/sign-in?suspended=true";
      return;
    }

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
  }, [liveUserRecord, token, isImpersonating, refresh, clearSession]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data: SessionPayload = await postAuth("/api/auth/login", { email, password });
      setAccessToken(data.accessToken);
      setCurrentUser(toAuthUser(data.user));
    } finally {
      setIsLoading(false);
    }
  };

  /** Used after flows (e.g. workspace registration) whose API response already set the cookies. */
  const loginWithToken = (newToken: string, user: AuthUser) => {
    setAccessToken(newToken);
    setCurrentUser(user);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await postAuth("/api/auth/logout").catch(() => {});
    } finally {
      clearSession();
      setIsLoading(false);
      if (typeof window !== "undefined") window.location.href = "/";
    }
  };

  const refreshUser = async () => {
    await refresh();
  };

  const impersonateUser = (newImpersonationToken: string) => {
    if (!accessToken) return;
    try {
      sessionStorage.setItem(IMPERSONATION_KEY, newImpersonationToken);
    } catch {
      /* ignore */
    }
    setImpersonationToken(newImpersonationToken);
  };

  const exitImpersonation = () => {
    try {
      sessionStorage.removeItem(IMPERSONATION_KEY);
    } catch {
      /* ignore */
    }
    setImpersonationToken(null);
    void refresh();
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

  // Role comes from the server-verified user record only (no e-mail based overrides).
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || isSuperAdmin;
  const isManager = role === "manager" || isAdmin;
  const isStaff = role === "staff" || isManager;
  const isSupplier = role === "supplier";

  const canViewFinancials = isAdmin || isManager;
  const canApproveReorders = isAdmin || isManager;
  const canManageUsers = isAdmin || isManager;

  const workspacePlan = currentUser?.plan || "starter";
  const planTier =
    currentUser?.planTier || (currentUser?.plan ? currentUser.plan.toUpperCase() : "STARTER");
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
