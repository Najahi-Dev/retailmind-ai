"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "./auth-context";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

interface Organization {
  _id: Id<"organizations">;
  name: string;
  slug: string;
  inviteCode: string;
  plan: "starter" | "growth" | "enterprise";
  logoUrl?: string;
  ownerId?: string;
  isActive: boolean;
  userRole?: string;
  isOwner?: boolean;
}

interface OrgContextType {
  activeOrg: Organization | null;
  orgList: (Organization & { isCurrent: boolean })[];
  isLoading: boolean;
  switchOrg: (orgId: Id<"organizations">) => Promise<void>;
  createOrg: (name: string) => Promise<void>;
  joinOrgByCode: (inviteCode: string) => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();

  const activeOrgData = useQuery(
    api.organizations.getCurrentOrganization,
    token ? { token } : "skip"
  );

  const orgListData = useQuery(
    api.organizations.getUserOrganizations,
    token ? { token } : "skip"
  );

  const switchOrgMutation = useMutation(api.organizations.switchActiveOrganization);
  const createOrgMutation = useMutation(api.organizations.createOrganization);
  const joinOrgMutation = useMutation(api.organizations.joinOrganizationByInviteCode);

  const activeOrg = (activeOrgData as Organization) || null;
  const orgList = (orgListData as (Organization & { isCurrent: boolean })[]) || [];
  const isLoading = isAuthenticated && activeOrgData === undefined;

  const switchOrg = async (orgId: Id<"organizations">) => {
    if (!token) return;
    try {
      await switchOrgMutation({ token, orgId });
      toast.success("Switched active workspace successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to switch workspace");
    }
  };

  const createOrg = async (name: string) => {
    if (!token) return;
    try {
      const res = await createOrgMutation({ token, name });
      toast.success(`Workspace "${name}" created! Invite code: ${res.inviteCode}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create workspace");
    }
  };

  const joinOrgByCode = async (inviteCode: string) => {
    if (!token) return;
    try {
      const res = await joinOrgMutation({ token, inviteCode });
      toast.success(`Joined workspace "${res.orgName}" successfully!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to join workspace with provided code");
    }
  };

  return (
    <OrgContext.Provider
      value={{
        activeOrg,
        orgList,
        isLoading,
        switchOrg,
        createOrg,
        joinOrgByCode,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return ctx;
}
