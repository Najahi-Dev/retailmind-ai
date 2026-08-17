"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function SuperAdminPurchaseOrders() {
  const { token } = useAuth();
  const pos = useQuery(api.workflowAdmin.getPlatformPurchaseOrders, { token: token ?? undefined });
  const [searchTerm, setSearchTerm] = useState("");

  if (pos === undefined) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading Purchase Orders...</div>;
  }

  const filteredPOs = pos.filter((po: any) => 
    po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Purchase Orders (Global View)</h1>
          <p className="text-indigo-200 mt-1">Monitor and oversee all cross-tenant purchase orders and supplier fulfillment.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-500" /> Recent Purchase Orders
              </CardTitle>
              <CardDescription>View all platform POs regardless of tenant.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by PO# or Status..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Tenant ID</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No purchase orders found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po: any) => (
                  <TableRow key={po._id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{po.orgId}</TableCell>
                    <TableCell>LKR {po.totalAmount?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={
                        po.status === "completed" ? "default" :
                        po.status === "pending" ? "secondary" :
                        po.status === "approved" ? "outline" : "destructive"
                      }>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-2" /> Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
