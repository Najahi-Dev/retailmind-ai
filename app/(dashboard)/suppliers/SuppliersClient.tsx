// app/(dashboard)/suppliers/SuppliersClient.tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TruckIcon,
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  CheckCircleIcon,
} from "lucide-react";
import AddSupplierDialog from "./AddSupplierDialog";

const STATUS_CONFIG = {
  active: {
    label: "Active",
    variant: "outline" as const,
    color: "text-green-500 p-3",
  },
  inactive: { label: "Inactive", variant: "secondary" as const, color: "p-3" },
  on_hold: {
    label: "On Hold",
    variant: "outline" as const,
    color: "text-yellow-500 p-3",
  },
};

export default function SuppliersClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const suppliers = useQuery(api.suppliers.getSuppliers, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const stats = useQuery(api.suppliers.getSupplierStats);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(val);

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    if (!search) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()),
    );
  }, [suppliers, search]);

  if (!suppliers || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-6 text-muted-foreground">
        <RefreshCwIcon className="animate-spin size-4" />
        Loading suppliers...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 @container/main">
      {/* ── KPI Cards ─────────────────────────── */}
      <div
        className="grid grid-cols-2 gap-4
        *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5
        *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs
        @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"
      >
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Suppliers</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {stats.total}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="p-3">
                <TruckIcon className="size-3" /> All
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-green-500">
              {stats.active}
            </CardTitle>
            <CardAction>
              <Badge
                variant="outline"
                className="text-green-500 p-3"
              >
                <CheckCircleIcon className="size-3" /> Active
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>On Hold</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-yellow-500">
              {stats.onHold}
            </CardTitle>
            <CardAction>
              <Badge
                variant="outline"
                className="text-yellow-50 p-3"
              >
                On Hold
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-muted-foreground">
              {stats.inactive}
            </CardTitle>
            <CardAction>
              <Badge variant="secondary" className="p-3">Inactive</Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </div>

      {/* ── Table Card ────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Suppliers</CardTitle>
              <CardDescription>
                {filtered.length} suppliers found
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <PlusIcon className="size-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Contact
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-center">
                    Lead Time
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-center">
                    Orders
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-right">
                    Total Value
                  </TableHead>
                  <TableHead className="hidden xl:table-cell text-center">
                    On-Time
                  </TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-16 text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <TruckIcon className="size-8 opacity-40" />
                        <p>No suppliers found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => {
                    const cfg =
                      STATUS_CONFIG[s.status as keyof typeof STATUS_CONFIG];
                    return (
                      <TableRow
                        key={s._id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/suppliers/${s._id}`)}
                      >
                        <TableCell>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground hidden sm:block">
                            {s.paymentTerms ?? "—"}
                          </p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p className="text-sm">{s.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.phone ?? "—"}
                          </p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-center">
                          <Badge variant="outline" className="font-mono">
                            {s.leadTimeDays}d
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-center font-medium">
                          {s.totalOrders}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right font-medium">
                          {formatCurrency(s.totalValue)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-center">
                          {s.onTimeRate !== null ? (
                            <span
                              className={`text-sm font-semibold ${
                                s.onTimeRate >= 80
                                  ? "text-green-500"
                                  : s.onTimeRate >= 60
                                    ? "text-yellow-500"
                                    : "text-destructive"
                              }`}
                            >
                              {s.onTimeRate}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className={cfg.color}>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddSupplierDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
