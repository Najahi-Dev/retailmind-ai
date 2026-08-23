"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckSquare, CheckCircle2, XCircle, Clock, ShoppingCart, TrendingDown, Building2, User2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

// ── Human-readable details renderer ──────────────────────────────────────
function ApprovalDetails({ req }: { req: any }) {
  const d = req.details ?? {};
  if (req.actionType === "LARGE_PO") {
    return (
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-slate-800 dark:text-white">
          LKR {Number(d.totalValue ?? 0).toLocaleString()} Purchase Order
        </p>
        <p className="text-xs text-slate-500">{(d.lineItems?.length ?? 0)} line items · PO# {d.poNumber}</p>
        <p className="text-xs text-slate-400">Requested by <span className="font-medium text-slate-600 dark:text-slate-300">{req.requesterName}</span></p>
      </div>
    );
  }
  if (req.actionType === "PRICE_DROP") {
    return (
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-slate-800 dark:text-white">
          {d.productName} <span className="text-xs font-mono text-slate-400">({d.productSku})</span>
        </p>
        <p className="text-xs text-slate-500">
          LKR {Number(d.currentPrice ?? 0).toLocaleString()} →{" "}
          <span className="text-red-600 font-bold">LKR {Number(d.newPrice ?? 0).toLocaleString()}</span>
          {" "}({d.dropPct}% drop)
        </p>
        <p className="text-xs text-slate-400">Requested by <span className="font-medium text-slate-600 dark:text-slate-300">{req.requesterName}</span></p>
      </div>
    );
  }
  return <span className="text-xs text-slate-400 font-mono">{JSON.stringify(d).slice(0, 80)}…</span>;
}

// ── Action type badge ─────────────────────────────────────────────────────
function ActionTypeBadge({ type }: { type: string }) {
  if (type === "LARGE_PO") return (
    <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30 gap-1.5">
      <ShoppingCart className="w-3 h-3" /> Large PO
    </Badge>
  );
  if (type === "PRICE_DROP") return (
    <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 gap-1.5">
      <TrendingDown className="w-3 h-3" /> Price Drop
    </Badge>
  );
  return (
    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
      {type}
    </Badge>
  );
}

export default function SuperAdminApprovals() {
  const { token } = useAuth();
  const approvals = useQuery(api.workflowAdmin.getPlatformApprovals, { token: token ?? undefined });
  const updateStatus = useMutation(api.workflowAdmin.updateApprovalStatus);

  const [confirm, setConfirm] = useState<{ id: string; status: "approved" | "rejected"; label: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  if (approvals === undefined) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Clock className="w-4 h-4 animate-spin" /> Loading approvals…
      </div>
    );
  }

  const pendingApprovals = approvals.filter((a: any) => a.status === "pending");
  const historyApprovals = approvals.filter((a: any) => a.status !== "pending");

  const handleConfirmedAction = async () => {
    if (!confirm) return;
    setLoading(confirm.id);
    try {
      await updateStatus({ token: token ?? undefined, approvalId: confirm.id as any, status: confirm.status });
      toast.success(
        confirm.status === "approved"
          ? "✅ Approved — the action has been executed."
          : "❌ Rejected — the request has been dismissed."
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to process request");
    } finally {
      setLoading(null);
      setConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Global Approval Center</h1>
          <p className="text-indigo-200 mt-1">Review and approve high-risk actions across all tenants — large POs and major price drops.</p>
        </div>
        {pendingApprovals.length > 0 && (
          <div className="relative z-10 flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 text-amber-200 px-4 py-2 rounded-xl text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            {pendingApprovals.length} pending
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Requests Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Pending Requests
              {pendingApprovals.length > 0 && (
                <Badge className="ml-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                  {pendingApprovals.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>High-risk actions blocked by AI guardrails awaiting your approval.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <CheckSquare className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-40" />
                      <p className="font-semibold text-sm">All caught up!</p>
                      <p className="text-xs mt-1 text-slate-400">No pending approvals at the moment.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingApprovals.map((req: any) => (
                    <TableRow key={req._id} className="align-top">
                      <TableCell className="pt-4">
                        <ActionTypeBadge type={req.actionType} />
                      </TableCell>
                      <TableCell className="pt-4">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-white">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {req.orgName ?? "Unknown Tenant"}
                        </div>
                      </TableCell>
                      <TableCell className="pt-4 max-w-[240px]">
                        <ApprovalDetails req={req} />
                      </TableCell>
                      <TableCell className="pt-4 text-xs text-slate-400 whitespace-nowrap">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="pt-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loading === req._id}
                          onClick={() => setConfirm({ id: req._id, status: "rejected", label: "reject this request" })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={loading === req._id}
                          onClick={() => setConfirm({ id: req._id, status: "approved", label: "approve and execute this action" })}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent History Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-500" /> Recent History
            </CardTitle>
            <CardDescription>Recently resolved requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historyApprovals.slice(0, 8).map((req: any) => (
                <div key={req._id} className="p-3 border rounded-xl flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <ActionTypeBadge type={req.actionType} />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[120px]">{req.orgName ?? "Unknown"}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <Badge
                    variant={req.status === "approved" ? "default" : "destructive"}
                    className={req.status === "approved"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0"
                      : "shrink-0"}
                  >
                    {req.status}
                  </Badge>
                </div>
              ))}
              {historyApprovals.length === 0 && (
                <div className="text-sm text-center text-muted-foreground py-6">No recent history.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirm} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirm?.status === "approved"
                ? <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Confirm Approval</>
                : <><XCircle className="w-5 h-5 text-red-500" /> Confirm Rejection</>
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to <strong>{confirm?.label}</strong>?
              {confirm?.status === "approved" && (
                <span className="block mt-2 text-emerald-700 dark:text-emerald-400 font-medium text-sm">
                  ⚡ The blocked action will be executed immediately upon approval.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedAction}
              className={confirm?.status === "approved"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"}
            >
              {confirm?.status === "approved" ? "Yes, Approve & Execute" : "Yes, Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

