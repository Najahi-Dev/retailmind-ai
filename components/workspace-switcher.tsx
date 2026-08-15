"use client";

import React, { useState } from "react";
import { useOrg } from "@/lib/org-context";
import {
  Building2Icon,
  ChevronsUpDownIcon,
  CheckIcon,
  PlusIcon,
  KeyRoundIcon,
  SparklesIcon,
  CopyIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function WorkspaceSwitcher() {
  const { activeOrg, orgList, switchOrg, createOrg, joinOrgByCode } = useOrg();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const [newOrgName, setNewOrgName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreating(true);
    try {
      await createOrg(newOrgName.trim());
      setNewOrgName("");
      setShowCreateModal(false);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      await joinOrgByCode(joinCode.trim());
      setJoinCode("");
      setShowJoinModal(false);
    } finally {
      setJoining(false);
    }
  };

  const copyInviteCode = () => {
    if (activeOrg?.inviteCode) {
      navigator.clipboard.writeText(activeOrg.inviteCode);
      toast.success("Workspace Invite Code copied to clipboard!");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-all border border-slate-200/80 dark:border-slate-700/60 text-left group cursor-pointer">
            <div className="flex items-center gap-2.5 truncate min-w-0">
              <div className="size-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <Building2Icon className="size-4" />
              </div>
              <div className="truncate flex-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                  {activeOrg?.name || "RetailMind Workspace"}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {activeOrg?.plan || "Enterprise"} Workspace
                </span>
              </div>
            </div>
            <ChevronsUpDownIcon className="size-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" side="bottom" sideOffset={6} className="w-64 rounded-xl p-1.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-1">
          <DropdownMenuLabel className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
            <span>Workspaces</span>
            {activeOrg?.inviteCode && (
              <button
                type="button"
                onClick={copyInviteCode}
                className="text-indigo-600 dark:text-indigo-400 hover:underline text-[10px] lowercase font-mono flex items-center gap-1"
                title="Copy Invite Code"
              >
                <CopyIcon className="size-3" /> {activeOrg.inviteCode}
              </button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

          {orgList.map((org) => (
            <DropdownMenuItem
              key={org._id}
              onClick={() => switchOrg(org._id)}
              className="rounded-lg p-2 flex items-center justify-between cursor-pointer focus:bg-indigo-50 dark:focus:bg-indigo-950/50"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2Icon className="size-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {org.name}
                </span>
              </div>
              {org.isCurrent && <CheckIcon className="size-4 text-indigo-600 dark:text-indigo-400" />}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

          <DropdownMenuItem onClick={() => setShowCreateModal(true)} className="rounded-lg p-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer focus:bg-indigo-50 dark:focus:bg-indigo-950/50">
            <PlusIcon className="size-4 mr-2" /> Create New Workspace
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowJoinModal(true)} className="rounded-lg p-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800">
            <KeyRoundIcon className="size-4 mr-2" /> Join Workspace via Code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Workspace Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <SparklesIcon className="size-5 text-indigo-500" /> Create New Organization Workspace
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Isolate inventory, orders, and suppliers into a dedicated company workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Workspace / Company Name</Label>
              <Input
                placeholder="e.g. Acme Supermarket Network"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                required
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="h-9 text-xs rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="h-9 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white">
                {creating ? "Creating..." : "Create Workspace"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join Workspace Modal */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRoundIcon className="size-5 text-indigo-500" /> Join Company Workspace
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter the workspace invitation code provided by your Organization Administrator.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleJoin} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Invitation Code</Label>
              <Input
                placeholder="e.g. INV-A1B2C3"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
                className="h-10 text-xs rounded-xl font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowJoinModal(false)} className="h-9 text-xs rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={joining} className="h-9 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white">
                {joining ? "Joining..." : "Join Workspace"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
