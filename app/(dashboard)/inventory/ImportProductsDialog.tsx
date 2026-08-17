// app/(dashboard)/inventory/ImportProductsDialog.tsx
"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UploadIcon,
  FileSpreadsheetIcon,
  DownloadIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  XIcon,
  CheckIcon,
  TagIcon,
  PlusCircleIcon,
  Trash2Icon,
  PencilIcon,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedProduct {
  sku: string;
  name: string;
  description?: string;
  categoryName?: string;
  unit: "pcs" | "kg" | "litre" | "box" | "ml";
  costPrice: number;
  sellingPrice: number;
  reorderPoint: number;
  safetyStock: number;
  initialStock: number;
  isValid: boolean;
  validationError?: string;
}

export default function ImportProductsDialog({ open, onOpenChange }: Props) {
  const batchImport = useMutation(api.inventory.batchImportProducts);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  // New categories state: originalLowerKey -> displayName (user can rename before import)
  const [newCategoryNames, setNewCategoryNames] = useState<Map<string, string>>(new Map());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [manualCategoryInput, setManualCategoryInput] = useState("");

  // Fetch existing org categories
  const existingCategories = useQuery(api.inventory.getCategories, { token: token ?? undefined }) ?? [];
  const existingCategoryNames = new Set(existingCategories.map((c) => c.name.toLowerCase()));

  // Sample CSV Downloader
  const downloadSampleCSV = () => {
    const headers = [
      "sku", "name", "description", "categoryName", "unit",
      "costPrice", "sellingPrice", "reorderPoint", "safetyStock", "initialStock",
    ];
    const sampleRows = [
      ["PROD-101", "Organic Fresh Milk 1L", "Pasteurized fresh whole milk", "Food & Beverages", "litre", "280", "350", "50", "20", "120"],
      ["PROD-102", "Basmati Rice 5kg", "Premium long grain basmati rice", "Food & Beverages", "kg", "1850", "2400", "30", "10", "60"],
      ["PROD-103", "Stainless Steel Kettle", "1.8L Electric cordless kettle", "Household Items", "pcs", "4200", "5900", "15", "5", "25"],
    ];
    const csvContent = [headers.join(","), ...sampleRows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "retailmind_product_import_sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // CSV Parser
  const parseCSVText = (text: string) => {
    const lines = text
      .split(/\r\n|\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      toast.error("CSV file is empty or missing headers");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const getColIndex = (names: string[]) => {
      for (const name of names) {
        const idx = headers.findIndex((h) => h.includes(name));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const skuIdx = getColIndex(["sku", "code", "product_code"]);
    const nameIdx = getColIndex(["name", "product_name", "title"]);
    const descIdx = getColIndex(["description", "desc", "details"]);
    const catIdx = getColIndex(["category", "categoryname", "cat"]);
    const unitIdx = getColIndex(["unit", "uom", "type"]);
    const costIdx = getColIndex(["cost", "costprice", "buy_price"]);
    const sellIdx = getColIndex(["sell", "selling", "sellingprice", "price"]);
    const reorderIdx = getColIndex(["reorder", "reorderpoint", "min_stock"]);
    const safetyIdx = getColIndex(["safety", "safetystock", "buffer"]);
    const stockIdx = getColIndex(["stock", "initialstock", "onhand", "qty", "quantity"]);

    const validUnits = ["pcs", "kg", "litre", "box", "ml"];
    const items: ParsedProduct[] = [];
    const detectedNewCats = new Map<string, string>();

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].match(/(\".*?\"|[^\",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");
      const cleanRow = row.map((cell) => cell.replace(/^"|"$/g, "").trim());

      const sku = skuIdx !== -1 ? cleanRow[skuIdx] ?? "" : cleanRow[0] ?? "";
      const name = nameIdx !== -1 ? cleanRow[nameIdx] ?? "" : cleanRow[1] ?? "";
      const description = descIdx !== -1 ? cleanRow[descIdx] : cleanRow[2];
      const categoryName = catIdx !== -1 ? cleanRow[catIdx] : cleanRow[3];

      const rawUnit = (unitIdx !== -1 ? cleanRow[unitIdx] : cleanRow[4] || "pcs").toLowerCase();
      const unit = (validUnits.includes(rawUnit) ? rawUnit : "pcs") as ParsedProduct["unit"];

      const costPrice = parseFloat((costIdx !== -1 ? cleanRow[costIdx] : cleanRow[5]) || "0") || 0;
      const sellingPrice = parseFloat((sellIdx !== -1 ? cleanRow[sellIdx] : cleanRow[6]) || "0") || 0;
      const reorderPoint = parseInt((reorderIdx !== -1 ? cleanRow[reorderIdx] : cleanRow[7]) || "10", 10) || 10;
      const safetyStock = parseInt((safetyIdx !== -1 ? cleanRow[safetyIdx] : cleanRow[8]) || "5", 10) || 5;
      const initialStock = parseInt((stockIdx !== -1 ? cleanRow[stockIdx] : cleanRow[9]) || "0", 10) || 0;

      // Detect new categories from CSV
      if (categoryName?.trim() && !existingCategoryNames.has(categoryName.trim().toLowerCase())) {
        const key = categoryName.trim().toLowerCase();
        if (!detectedNewCats.has(key)) detectedNewCats.set(key, categoryName.trim());
      }

      let isValid = true;
      let validationError = "";
      if (!sku.trim()) { isValid = false; validationError = "SKU is required"; }
      else if (!name.trim()) { isValid = false; validationError = "Product Name is required"; }

      items.push({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() || undefined,
        categoryName: categoryName?.trim() || undefined,
        unit,
        costPrice,
        sellingPrice,
        reorderPoint,
        safetyStock,
        initialStock,
        isValid,
        validationError,
      });
    }

    setParsedProducts(items);
    setNewCategoryNames(detectedNewCats);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith(".csv")) { toast.error("Please upload a valid .csv file"); return; }
    setFile(selectedFile);
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      parseCSVText(evt.target?.result as string);
      setParsing(false);
    };
    reader.readAsText(selectedFile);
  };

  // ── Category helpers ──
  const startEditCategory = (key: string) => {
    setEditingCategory(key);
    setEditValue(newCategoryNames.get(key) ?? "");
  };
  const saveEditCategory = (key: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setNewCategoryNames((prev) => { const n = new Map(prev); n.set(key, trimmed); return n; });
    setEditingCategory(null);
    setEditValue("");
  };
  const removeNewCategory = (key: string) => {
    setNewCategoryNames((prev) => { const n = new Map(prev); n.delete(key); return n; });
  };
  const addManualCategory = () => {
    const trimmed = manualCategoryInput.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (existingCategoryNames.has(key) || newCategoryNames.has(key)) { toast.error("Category already exists"); return; }
    setNewCategoryNames((prev) => new Map(prev).set(key, trimmed));
    setManualCategoryInput("");
  };

  const handleImport = async () => {
    const validItems = parsedProducts.filter((p) => p.isValid);
    if (!validItems.length) { toast.error("No valid product rows to import"); return; }

    setImporting(true);
    try {
      const res = await batchImport({
        token: token ?? undefined,
        products: validItems.map((p) => {
          const catKey = p.categoryName?.toLowerCase() ?? "";
          const resolvedCat = newCategoryNames.has(catKey)
            ? newCategoryNames.get(catKey)
            : p.categoryName;
          return {
            sku: p.sku,
            name: p.name,
            category: resolvedCat || undefined,
            unit: p.unit,
            costPrice: p.costPrice,
            sellingPrice: p.sellingPrice,
            reorderPoint: p.reorderPoint,
            safetyStock: p.safetyStock,
            minStockLevel: p.initialStock,
          };
        }),
      });

      if (res) {
        toast.success(
          `Successfully imported ${res.importedCount} products! ${
            res.skippedCount > 0 ? `(${res.skippedCount} skipped due to duplicate SKU or invalid fields)` : ""
          }`
        );
      }

      setFile(null);
      setParsedProducts([]);
      setNewCategoryNames(new Map());
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import CSV products");
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedProducts.filter((p) => p.isValid).length;
  const invalidCount = parsedProducts.filter((p) => !p.isValid).length;
  const newCatsArray = Array.from(newCategoryNames.entries());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-xl border-slate-200 dark:border-slate-800 p-6 max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheetIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Batch Import Products from CSV
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleCSV}
              className="h-8 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              <DownloadIcon className="w-3.5 h-3.5 mr-1.5" /> Download Template CSV
            </Button>
          </div>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Upload a CSV file containing product SKUs, names, prices, categories, and initial inventory stock levels.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* File Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              file
                ? "border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10"
                : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/50"
            }`}
          >
            <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileChange} className="hidden" />
            <div className="flex flex-col items-center gap-2">
              <div className="size-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <UploadIcon className="w-5 h-5" />
              </div>
              {file ? (
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB • Click to change file</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Click to browse or drag & drop CSV file</p>
                  <p className="text-xs text-slate-500 mt-0.5">Supports CSV files up to 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Parsing Spinner */}
          {parsing && (
            <div className="flex items-center justify-center gap-2 p-4 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <RefreshCwIcon className="w-4 h-4 animate-spin" /> Parsing CSV rows...
            </div>
          )}

          {/* ── Categories Panel ── */}
          {parsedProducts.length > 0 && (
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5" />
                  Categories
                </p>
                <div className="flex items-center gap-1.5">
                  {existingCategories.length > 0 && (
                    <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 text-[10px]">
                      {existingCategories.length} existing
                    </Badge>
                  )}
                  {newCatsArray.length > 0 && (
                    <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 text-[10px]">
                      <PlusCircleIcon className="w-3 h-3 mr-1" />
                      {newCatsArray.length} will be created
                    </Badge>
                  )}
                </div>
              </div>

              {/* New categories from CSV */}
              {newCatsArray.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                    New categories from CSV — will be auto-created on import:
                  </p>
                  <div className="space-y-1">
                    {newCatsArray.map(([key, displayName]) => (
                      <div key={key} className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-800 px-3 py-2">
                        <TagIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {editingCategory === key ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditCategory(key);
                                if (e.key === "Escape") setEditingCategory(null);
                              }}
                              className="h-6 text-xs px-2 rounded-md flex-1"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50" onClick={() => saveEditCategory(key)}>
                              <CheckIcon className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setEditingCategory(null)}>
                              <XIcon className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex-1">{displayName}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50" onClick={() => startEditCategory(key)} title="Rename category">
                              <PencilIcon className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={() => removeNewCategory(key)} title="Remove — products will import without a category">
                              <Trash2Icon className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual category add */}
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                  Add a new category manually:
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. Electronics, Dairy, Stationery…"
                    value={manualCategoryInput}
                    onChange={(e) => setManualCategoryInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addManualCategory(); }}
                    className="h-8 text-xs rounded-lg flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addManualCategory}
                    disabled={!manualCategoryInput.trim()}
                    className="h-8 rounded-lg text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                  >
                    <PlusCircleIcon className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                {newCatsArray.length === 0 && existingCategories.length > 0 && (
                  <p className="text-[10px] text-slate-400">All CSV categories already exist. You can still add extras above.</p>
                )}
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedProducts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold px-1">
                <p className="text-slate-700 dark:text-slate-300">Preview Rows ({parsedProducts.length} Total)</p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                    <CheckIcon className="w-3 h-3 mr-1" /> {validCount} Valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px]">
                      <AlertTriangleIcon className="w-3 h-3 mr-1" /> {invalidCount} Invalid
                    </Badge>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-[11px] font-bold">Status</TableHead>
                      <TableHead className="text-[11px] font-bold">SKU</TableHead>
                      <TableHead className="text-[11px] font-bold">Product Name</TableHead>
                      <TableHead className="text-[11px] font-bold">Category</TableHead>
                      <TableHead className="text-[11px] font-bold text-right">Cost</TableHead>
                      <TableHead className="text-[11px] font-bold text-right">Price</TableHead>
                      <TableHead className="text-[11px] font-bold text-right">Initial Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedProducts.slice(0, 20).map((prod, idx) => {
                      const catKey = prod.categoryName?.toLowerCase() ?? "";
                      const isNew = !!catKey && newCategoryNames.has(catKey);
                      const resolvedCatName = isNew ? newCategoryNames.get(catKey) : prod.categoryName;
                      return (
                        <TableRow key={idx} className="text-xs">
                          <TableCell>
                            {prod.isValid ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 py-0">Valid</Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] px-1.5 py-0">{prod.validationError ?? "Invalid"}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-bold">{prod.sku || "-"}</TableCell>
                          <TableCell className="font-semibold text-slate-900 dark:text-white max-w-[160px] truncate">{prod.name || "-"}</TableCell>
                          <TableCell>
                            {resolvedCatName ? (
                              <span className="flex items-center gap-1">
                                <span className="text-slate-700 dark:text-slate-300">{resolvedCatName}</span>
                                {isNew && (
                                  <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[9px] px-1 py-0">new</Badge>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">LKR {prod.costPrice}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">LKR {prod.sellingPrice}</TableCell>
                          <TableCell className="text-right font-semibold">{prod.initialStock}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {parsedProducts.length > 20 && (
                <p className="text-[11px] text-slate-400 text-center">Showing first 20 of {parsedProducts.length} rows</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 rounded-xl text-xs font-semibold px-4">
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || validCount === 0}
            className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-5 shadow-md border-0"
          >
            {importing ? (
              <><RefreshCwIcon className="w-3.5 h-3.5 mr-2 animate-spin" /> Importing Products...</>
            ) : (
              <><UploadIcon className="w-3.5 h-3.5 mr-2" /> Confirm & Import {validCount} Products</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
