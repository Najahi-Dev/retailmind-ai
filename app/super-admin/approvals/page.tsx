"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, Search, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export default function SuperAdminApprovals() {
  const { token } = useAuth();
  const approvals = useQuery(api.workflowAdmin.getPlatformApprovals, { token: token ?? undefined });
  const updateStatus = useMutation(api.workflowAdmin.updateApprovalStatus);
  const [searchTerm, setSearchTerm] = useState("");

  if (approvals === undefined) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading Approvals...</div>;
  }

  const pendingApprovals = approvals.filter((a: any) => a.status === "pending");
  const historyApprovals = approvals.filter((a: any) => a.status !== "pending");

  const handleAction = async (id: any, status: "approved" | "rejected") => {
    try {
      await updateStatus({ token: token ?? undefined, approvalId: id, status });
      toast.success(`Request ${status} successfully`);
    } catch (e: any) {
      toast.error(e.message || "Failed to process request");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Global Approval Center</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve high-risk actions across all tenants (e.g., massive price drops, huge POs).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" /> Pending Requests
                </CardTitle>
                <CardDescription>High-risk actions blocked by AI guardrails awaiting your approval.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Tenant ID</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground border-dashed border rounded-lg">
                      <CheckSquare className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-50" />
                      No pending approvals. You are all caught up!
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingApprovals.map((req: any) => (
                    <TableRow key={req._id}>
                      <TableCell className="font-medium">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                          {req.actionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{req.orgId}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {JSON.stringify(req.details)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleAction(req._id, "rejected")} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                        <Button variant="default" size="sm" onClick={() => handleAction(req._id, "approved")} className="bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-500" /> Recent History
            </CardTitle>
            <CardDescription>Recently resolved requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historyApprovals.slice(0, 5).map((req: any) => (
                <div key={req._id} className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{req.actionType}</div>
                    <div className="text-xs text-muted-foreground truncate w-32">{req.orgId}</div>
                  </div>
                  <Badge variant={req.status === "approved" ? "default" : "destructive"}>
                    {req.status}
                  </Badge>
                </div>
              ))}
              {historyApprovals.length === 0 && (
                <div className="text-sm text-center text-muted-foreground py-4">No recent history.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
