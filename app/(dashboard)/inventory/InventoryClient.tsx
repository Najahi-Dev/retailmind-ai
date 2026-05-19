"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { useRouter }   from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input }  from "@/components/ui/input";
import { Badge }  from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PackageIcon,
  AlertTriangleIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  SearchIcon,
  RefreshCwIcon,
  PlusIcon,
  UploadIcon,
  DownloadIcon,
} from "lucide-react";

interface Props {
  role: string;
}

const STATUS_CONFIG = {
  critical:  { label: "Critical",  variant: "destructive" as const },
  low:       { label: "Low Stock", variant: "secondary"   as const },
  healthy:   { label: "Healthy",   variant: "outline"     as const },
  overstock: { label: "Overstock", variant: "secondary"   as const },
};

export default function InventoryClient({ role }: Props) {
  const router    = useRouter();
  const inventory = useQuery(api.inventory.getInventoryOverview);
  const stats     = useQuery(api.inventory.getInventoryStats);

  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy,         setSortBy]         = useState("name");
  const [page,           setPage]           = useState(1);

  const PAGE_SIZE         = 25;
  const canViewFinancials = ["admin", "manager"].includes(role);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style:                 "currency",
      currency:              "LKR",
      maximumFractionDigits: 0,
    }).format(val);

  const categories = useMemo(() => {
    if (!inventory) return [];
    return [...new Set(inventory.map(i => i!.category))].sort();
  }, [inventory]);

  const filtered = useMemo(() => {
    if (!inventory) return [];
    return inventory
      .filter(Boolean)
      .filter(item => {
        const matchSearch = search === "" ||
          item!.name.toLowerCase().includes(search.toLowerCase()) ||
          item!.sku.toLowerCase().includes(search.toLowerCase());
        const matchStatus   = statusFilter   === "all" || item!.status   === statusFilter;
        const matchCategory = categoryFilter === "all" || item!.category === categoryFilter;
        return matchSearch && matchStatus && matchCategory;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name":       return a!.name.localeCompare(b!.name);
          case "sku":        return a!.sku.localeCompare(b!.sku);
          case "onHand":     return b!.onHand - a!.onHand;
          case "status":     return a!.status.localeCompare(b!.status);
          case "stockValue": return b!.stockValue - a!.stockValue;
          default:           return 0;
        }
      });
  }, [inventory, search, statusFilter, categoryFilter, sortBy]);

  // Export CSV function
const handleExportCSV = () => {
  if (!filtered.length) return;

  const headers = [
    "SKU", "Product Name", "Category", "Location",
    "On Hand", "Available", "Reserved",
    "Reorder Point", "Safety Stock", "Status",
    ...(canViewFinancials ? ["Stock Value (LKR)"] : []),
  ];

  const rows = filtered.map(item => [
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

  const csv = [headers, ...rows]
    .map(row => row.join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// CSV Upload handler (basic — full import later)
const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  // TODO: Phase 2 — full CSV import with validation
  alert(`File selected: ${file.name}\nFull CSV import coming in Phase 2!`);
  e.target.value = ""; // Reset
};

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Loading ───────────────────────────────────
  if (!inventory || !stats) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 @container/main">
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-8 w-32 rounded bg-muted mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <RefreshCwIcon className="animate-spin h-4 w-4" />
          Loading inventory...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 @container/main">
      {/* ── KPI Cards ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {/* Total SKUs */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total SKUs</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.totalProducts.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <PackageIcon className="size-3" />
                All Products
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>

        {/* Critical */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Critical Stock</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-destructive">
              {stats.criticalCount}
            </CardTitle>
            <CardAction>
              <Badge variant="destructive">
                <AlertTriangleIcon className="size-3" />
                Urgent
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>

        {/* Low Stock */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Low Stock</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-yellow-500">
              {stats.lowCount}
            </CardTitle>
            <CardAction>
              <Badge
                variant="outline"
                className="text-yellow-500 border-yellow-200"
              >
                <TrendingDownIcon className="size-3" />
                Warning
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>

        {/* Stock Value or Healthy count */}
        {canViewFinancials ? (
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Stock Value</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
                {formatCurrency(stats.totalValue)}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <TrendingUpIcon className="size-3" />
                  LKR
                </Badge>
              </CardAction>
            </CardHeader>
          </Card>
        ) : (
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Healthy</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-green-500">
                {stats.healthyCount}
              </CardTitle>
              <CardAction>
                <Badge
                  variant="outline"
                  className="text-green-500 border-green-200"
                >
                  <TrendingUpIcon className="size-3" />
                  Good
                </Badge>
              </CardAction>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* ── Inventory Table Card ───────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Inventory Overview</CardTitle>
              <CardDescription>
                {filtered.length} products found
              </CardDescription>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Export CSV — Admin + Manager */}
              {canViewFinancials && (
                <Button variant="outline" size="lg" onClick={handleExportCSV}>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}

              {/* Import CSV — Admin + Manager */}
              {canViewFinancials && (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() =>
                      document.getElementById("csv-upload")?.click()
                    }
                  >
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                  {/* Hidden file input */}
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCSVUpload}
                  />
                </>
              )}

              {/* Add Product — Admin + Manager */}
              {canViewFinancials && (
                <>
                  <Button size="lg" onClick={() => router.push("/inventory/add") }>
                    <PackageIcon className="h-4 w-4 mr-2" />
                    Record Stock In
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => router.push("/inventory/adjust") }>
                    Stock Adjustment
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => router.push("/inventory/transfer") }>
                    Transfer Stock
                  </Button>
                  <Button size="lg" onClick={() => router.push("/inventory/add-product") }>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
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
              <SelectTrigger className="w-full sm:w-44">
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
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="sku">SKU</SelectItem>
                <SelectItem value="onHand">On Hand</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                {canViewFinancials && (
                  <SelectItem value="stockValue">Stock Value</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Category
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Location
                  </TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">
                    Available
                  </TableHead>
                  <TableHead className="text-right hidden lg:table-cell">
                    Reorder Pt.
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Stock Level
                  </TableHead>
                  {canViewFinancials && (
                    <TableHead className="text-right hidden xl:table-cell">
                      Stock Value
                    </TableHead>
                  )}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canViewFinancials ? 9 : 8}
                      className="text-center py-16 text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <PackageIcon className="h-8 w-8 text-muted-foreground/50" />
                        <p>No products found</p>
                        <p className="text-xs">
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((item) => (
                    <TableRow
                      key={item!.inventoryId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/inventory/${item!.productId}`)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item!.sku}
                      </TableCell>
                      <TableCell className="font-medium max-w-40 truncate">
                        {item!.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {item!.category}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {item!.location}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item!.onHand}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                        {item!.available}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground hidden lg:table-cell">
                        {item!.reorderPoint}
                      </TableCell>

                      {/* Stock Bar — add this new column */}
                      <TableCell className="hidden xl:table-cell w-28">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${item!.stockPct}%`,
                                background:
                                  item!.status === "critical"
                                    ? "#ef4444"
                                    : item!.status === "low"
                                      ? "#f59e0b"
                                      : item!.status === "overstock"
                                        ? "#8b5cf6"
                                        : "#22c55e",
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {item!.stockPct}%
                          </span>
                        </div>
                      </TableCell>

                      {canViewFinancials && (
                        <TableCell className="text-right font-medium hidden xl:table-cell">
                          {formatCurrency(item!.stockValue)}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={STATUS_CONFIG[item!.status].variant}>
                          {STATUS_CONFIG[item!.status].label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} — {filtered.length} total products
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}