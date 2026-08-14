"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Search,
  RefreshCw,
  Plus,
  Upload,
  Download,
  MapPin,
  Filter,
  DollarSign,
  Boxes,
  ArrowRightLeft,
  SlidersHorizontal,
  ArrowUpRight,
  BrainCircuit,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import ImportProductsDialog from "./ImportProductsDialog";

interface Props {
  role: string;
}

const STATUS_CONFIG = {
  critical: {
    label: "Critical",
    variant: "destructive" as const,
    bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  },
  low: {
    label: "Low Stock",
    variant: "secondary" as const,
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  healthy: {
    label: "Healthy",
    variant: "outline" as const,
    bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  overstock: {
    label: "Overstock",
    variant: "secondary" as const,
    bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
};

export default function InventoryClient({ role }: Props) {
  const router = useRouter();
  const inventory = useQuery(api.inventory.getInventoryOverview);
  const stats = useQuery(api.inventory.getInventoryStats);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);

  const PAGE_SIZE = 25;
  const canViewFinancials = ["admin", "manager"].includes(role);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(val);

  const categories = useMemo(() => {
    if (!inventory) return [];
    return [...new Set(inventory.map((i) => i!.category))].sort();
  }, [inventory]);

  const locations = useMemo(() => {
    if (!inventory) return [];
    return [...new Set(inventory.map((i) => i!.location))].sort();
  }, [inventory]);

  const filtered = useMemo(() => {
    if (!inventory) return [];
    return inventory
      .filter(Boolean)
      .filter((item) => {
        const query = search.toLowerCase();
        const matchSearch =
          search === "" ||
          item!.name.toLowerCase().includes(query) ||
          item!.sku.toLowerCase().includes(query) ||
          item!.category.toLowerCase().includes(query) ||
          item!.location.toLowerCase().includes(query);

        const matchStatus = statusFilter === "all" || item!.status === statusFilter;
        const matchCategory = categoryFilter === "all" || item!.category === categoryFilter;
        const matchLocation = locationFilter === "all" || item!.location === locationFilter;

        return matchSearch && matchStatus && matchCategory && matchLocation;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a!.name.localeCompare(b!.name);
          case "sku":
            return a!.sku.localeCompare(b!.sku);
          case "onHand":
            return b!.onHand - a!.onHand;
          case "status":
            return a!.status.localeCompare(b!.status);
          case "stockValue":
            return b!.stockValue - a!.stockValue;
          default:
            return 0;
        }
      });
  }, [inventory, search, statusFilter, categoryFilter, locationFilter, sortBy]);

  const handleExportCSV = () => {
    if (!filtered.length) return;

    const headers = [
      "SKU",
      "Product Name",
      "Category",
      "Location",
      "On Hand",
      "Available",
      "Reserved",
      "Reorder Point",
      "Safety Stock",
      "Status",
      ...(canViewFinancials ? ["Stock Value (LKR)"] : []),
    ];

    const rows = filtered.map((item) => [
      item!.sku,
      item!.name,
      item!.category,
      item!.location,
      item!.onHand,
      item!.available,
      item!.reserved,
      item!.reorderPoint,
      item!.safetyStock,
      item!.status,
      ...(canViewFinancials ? [item!.stockValue.toFixed(2)] : []),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    alert(`File selected: ${file.name}\nFull CSV batch import coming in Phase 2!`);
    e.target.value = "";
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!inventory || !stats) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-slate-500 font-medium">
        <RefreshCw className="animate-spin w-6 h-6 text-indigo-600" />
        <span>Synchronizing Multi-Branch Inventory Tracking...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">

      {/* ── 1. EXECUTIVE HERO BANNER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        {/* Glow Overlay */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs px-3 py-0.5">
              <BrainCircuit className="w-3.5 h-3.5 mr-1 text-indigo-400 animate-pulse" />
              Multi-Branch Inventory Engine
            </Badge>
            <span className="text-slate-400 text-xs hidden sm:inline">• Live Warehouse Tracking Across Sri Lanka</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Supermarket Inventory Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Real-time stock valuation, automated safety thresholds, branch transfers, and stock movement logs across 1,001 active SKUs.
          </p>
        </div>

        {/* Action Controls */}
        {canViewFinancials && (
          <div className="flex flex-wrap items-center gap-2.5 z-10">
            <Button
              size="sm"
              onClick={() => router.push("/inventory/add-product")}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-md border-0 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add New SKU
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/inventory/add")}
              className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl"
            >
              <Boxes className="w-4 h-4 mr-1.5 text-emerald-400" /> Stock In
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl"
            >
              <Upload className="w-4 h-4 mr-1.5 text-purple-400" /> Import CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl"
            >
              <Download className="w-4 h-4 mr-1.5 text-indigo-400" /> Export CSV
            </Button>
          </div>
        )}
      </div>

      {/* ── 2. EXECUTIVE KPI GRID (4 METRICS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Stock Valuation */}
        {canViewFinancials ? (
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <CardHeader className="pb-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Stock Valuation</CardDescription>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                {formatCurrency(stats.totalValue)}
              </CardTitle>
            </CardHeader>
            <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" /> +12.4% vs last mo
              </span>
              <span>Cost basis</span>
            </CardFooter>
          </Card>
        ) : (
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <CardHeader className="pb-2 space-y-1.5">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Healthy Stock SKUs</CardDescription>
              <CardTitle className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {stats.healthyCount} SKUs
              </CardTitle>
            </CardHeader>
            <CardFooter className="pt-0 text-xs text-slate-500">Normal Stock Levels</CardFooter>
          </Card>
        )}

        {/* Total Tracked SKUs */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Product SKUs</CardDescription>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {stats.totalProducts.toLocaleString()} SKUs
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.healthyCount} Healthy ({Math.round((stats.healthyCount / stats.totalProducts) * 100)}%)
            </span>
            <span>4 Warehouses</span>
          </CardFooter>
        </Card>

        {/* Critical Stock Risk */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Critical Risk Items</CardDescription>
              <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-red-600 dark:text-red-400 tabular-nums tracking-tight">
              {stats.criticalCount} Item
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="text-red-600 dark:text-red-400 font-semibold">Below Safety Threshold</span>
            <span>Urgent PO needed</span>
          </CardFooter>
        </Card>

        {/* Low Stock Warning */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Low Stock Warnings</CardDescription>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
              {stats.lowCount} SKUs
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="text-amber-600 dark:text-amber-400 font-semibold">Below Reorder Point</span>
            <span className="text-blue-500 font-medium">{stats.overstockCount} Overstock</span>
          </CardFooter>
        </Card>

      </div>

      {/* ── 3. LOCATION BRANCH TABS ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Button
          size="sm"
          variant={locationFilter === "all" ? "default" : "outline"}
          onClick={() => {
            setLocationFilter("all");
            setPage(1);
          }}
          className={`rounded-xl text-xs font-semibold ${
            locationFilter === "all"
              ? "bg-indigo-600 text-white"
              : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
          }`}
        >
          <Store className="w-3.5 h-3.5 mr-1.5" /> All Locations ({inventory.length})
        </Button>

        {locations.map((loc) => {
          const count = inventory.filter((i) => i!.location === loc).length;
          return (
            <Button
              key={loc}
              size="sm"
              variant={locationFilter === loc ? "default" : "outline"}
              onClick={() => {
                setLocationFilter(loc);
                setPage(1);
              }}
              className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
                locationFilter === loc
                  ? "bg-indigo-600 text-white"
                  : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
              {loc} ({count})
            </Button>
          );
        })}
      </div>

      {/* ── 4. INVENTORY OVERVIEW DATA TABLE CONTAINER ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Live Stock Catalog & Inventory Records
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                Showing {filtered.length} products matching current filters
              </CardDescription>
            </div>

            {/* Quick Operations Button Bar */}
            {canViewFinancials && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/inventory/add")}
                  className="h-8 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 px-2.5"
                >
                  <Boxes className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Record Stock In
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/inventory/adjust")}
                  className="h-8 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 px-2.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-amber-500" /> Adjustment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/inventory/transfer")}
                  className="h-8 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 px-2.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Transfer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/inventory/stock-out")}
                  className="h-8 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 px-2.5"
                >
                  <TrendingDown className="w-3.5 h-3.5 mr-1 text-red-500" /> Stock-Out
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6 flex flex-col gap-4">
          {/* Search & Select Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, SKU, category, or location..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-36 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="overstock">Overstock</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="sku">SKU Code</SelectItem>
                <SelectItem value="onHand">On Hand Qty</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                {canViewFinancials && <SelectItem value="stockValue">Stock Value</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {/* High-Contrast Data Table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-100/90 dark:bg-slate-800/90 sticky top-0 z-10 backdrop-blur-md">
                <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-transparent h-11">
                  <TableHead className="font-bold text-sm text-slate-800 dark:text-slate-200">SKU</TableHead>
                  <TableHead className="font-bold text-sm text-slate-800 dark:text-slate-200">Product Name</TableHead>
                  <TableHead className="hidden md:table-cell font-bold text-sm text-slate-800 dark:text-slate-200">Category</TableHead>
                  <TableHead className="hidden lg:table-cell font-bold text-sm text-slate-800 dark:text-slate-200">Location</TableHead>
                  <TableHead className="text-right font-bold text-sm text-slate-800 dark:text-slate-200">On Hand</TableHead>
                  <TableHead className="text-right hidden sm:table-cell font-bold text-sm text-slate-800 dark:text-slate-200">Available</TableHead>
                  <TableHead className="text-right hidden lg:table-cell font-bold text-sm text-slate-800 dark:text-slate-200">Reorder Pt.</TableHead>
                  <TableHead className="hidden xl:table-cell font-bold text-sm text-slate-800 dark:text-slate-200">Stock Level</TableHead>
                  {canViewFinancials && (
                    <TableHead className="text-right hidden xl:table-cell font-bold text-sm text-slate-800 dark:text-slate-200">
                      Stock Value
                    </TableHead>
                  )}
                  <TableHead className="font-bold text-sm text-slate-800 dark:text-slate-200">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canViewFinancials ? 10 : 9}
                      className="text-center py-16 text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-10 w-10 text-indigo-500/40" />
                        <p className="font-bold text-sm text-slate-900 dark:text-white">No Products Found</p>
                        <p className="text-xs text-slate-500">Try adjusting your search criteria or clear location filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((item) => {
                    const statusCfg = STATUS_CONFIG[item!.status];
                    return (
                      <TableRow
                        key={item!.inventoryId}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800/80 h-12"
                        onClick={() => router.push(`/inventory/${item!.productId}`)}
                      >
                        <TableCell className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {item!.sku}
                        </TableCell>
                        <TableCell className="font-bold text-sm text-slate-900 dark:text-white max-w-48 truncate">
                          {item!.name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-slate-600 dark:text-slate-400 text-sm">
                          {item!.category}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-slate-600 dark:text-slate-400 text-sm">
                          {item!.location}
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm text-slate-900 dark:text-white">
                          {item!.onHand}
                        </TableCell>
                        <TableCell className="text-right text-slate-500 dark:text-slate-400 text-sm font-medium hidden sm:table-cell">
                          {item!.available}
                        </TableCell>
                        <TableCell className="text-right text-slate-500 text-sm hidden lg:table-cell">
                          {item!.reorderPoint}
                        </TableCell>

                        {/* Stock Progress Bar */}
                        <TableCell className="hidden xl:table-cell w-32">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(item!.stockPct, 100)}%`,
                                  background:
                                    item!.status === "critical"
                                      ? "#ef4444"
                                      : item!.status === "low"
                                        ? "#f59e0b"
                                        : item!.status === "overstock"
                                          ? "#3b82f6"
                                          : "#10b981",
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 w-8 text-right">
                              {item!.stockPct}%
                            </span>
                          </div>
                        </TableCell>

                        {canViewFinancials && (
                          <TableCell className="text-right font-bold text-sm text-slate-900 dark:text-white hidden xl:table-cell tabular-nums">
                            {formatCurrency(item!.stockValue)}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge className={`text-xs font-semibold px-2.5 py-0.5 border ${statusCfg.bg}`}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Showing page <span className="font-bold text-slate-900 dark:text-white">{page}</span> of{" "}
                <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span> —{" "}
                <span className="font-bold text-slate-900 dark:text-white">{filtered.length}</span> total items
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 rounded-xl text-xs border-slate-300 dark:border-slate-800"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-8 rounded-xl text-xs border-slate-300 dark:border-slate-800"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ImportProductsDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}