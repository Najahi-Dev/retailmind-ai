"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Search, Eye, Package, XCircle, CheckSquare, Clock, Truck, FileEdit, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";

export default function SuperAdminPurchaseOrders() {
  const { token } = useAuth();
  const pos = useQuery(api.workflowAdmin.getPlatformPurchaseOrders, { token: token ?? undefined });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPO, setSelectedPO] = useState<any>(null);

  if (pos === undefined) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading Purchase Orders...</div>;
  }

  const filteredPOs = pos.filter((po: any) => {
    const matchesSearch = po.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by PO#..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Tenant Name</TableHead>
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
                    <TableCell className="text-muted-foreground text-xs">{po.orgName || po.orgId}</TableCell>
                    <TableCell>LKR {po.totalValue?.toLocaleString()}</TableCell>
                    <TableCell>
                      {(() => {
                        const baseClasses = "rounded-full px-3 py-1 flex items-center gap-1.5 w-fit font-medium";
                        switch (po.status) {
                          case "delivered":
                            return <Badge className={`bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 ${baseClasses}`} variant="outline"><Package className="w-3.5 h-3.5" /> Delivered</Badge>;
                          case "cancelled":
                            return <Badge className={`bg-red-100 text-red-700 border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 ${baseClasses}`} variant="outline"><XCircle className="w-3.5 h-3.5" /> Cancelled</Badge>;
                          case "draft":
                            return <Badge className={`bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700 ${baseClasses}`} variant="outline"><Clock className="w-3.5 h-3.5" /> Draft</Badge>;
                          case "sent":
                            return <Badge className={`bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800 ${baseClasses}`} variant="outline"><Clock className="w-3.5 h-3.5" /> Sent</Badge>;
                          case "confirmed":
                            return <Badge className={`bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 ${baseClasses}`} variant="outline"><CheckSquare className="w-3.5 h-3.5" /> Confirmed</Badge>;
                          case "shipped":
                            return <Badge className={`bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800 ${baseClasses}`} variant="outline"><Truck className="w-3.5 h-3.5" /> Shipped</Badge>;
                          default:
                            return <Badge className={`bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 ${baseClasses}`} variant="outline">{po.status}</Badge>;
                        }
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPO(po)}>
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

      <Dialog open={!!selectedPO} onOpenChange={(open) => !open && setSelectedPO(null)}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Purchase Order Details: {selectedPO?.poNumber}</DialogTitle>
            <DialogDescription>
              Detailed view of the purchase order payload and metadata.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Tenant</p>
                <p className="font-medium">{selectedPO?.orgName || selectedPO?.orgId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Value</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                  LKR {selectedPO?.totalValue?.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Created Date</p>
                <p className="font-medium">
                  {selectedPO?.createdAt ? new Date(selectedPO.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Req. Delivery</p>
                <p className="font-medium">
                  {selectedPO?.requestedDelivery ? new Date(selectedPO.requestedDelivery).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="space-y-1 overflow-hidden">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Supplier</p>
                <p className="font-medium truncate" title={selectedPO?.supplierName || "Unknown Supplier"}>
                  {selectedPO?.supplierName || "Unknown Supplier"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Status</p>
                <p className="font-medium capitalize">{selectedPO?.status}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" /> Line Items
              </h4>
              <div className="border rounded-md overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Unit Cost (LKR)</TableHead>
                      <TableHead className="text-right">Total (LKR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO?.lineItems?.map((item: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                            <QrCode className="w-4 h-4" />
                          </Button>
                          {item.sku}
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.quantityOrdered}</TableCell>
                        <TableCell className="text-right">{item.quantityReceived || 0}</TableCell>
                        <TableCell className="text-right">{item.unitCost?.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">{item.lineTotal?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {!selectedPO?.lineItems?.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No line items in this order</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
