"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Database,
  Download,
  Upload,
  UploadCloud,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  FileJson,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Activity,
  Boxes,
  Truck,
  ShoppingCart,
  Bell,
  Layers,
  ArrowLeft,
  FileCheck,
} from "lucide-react";
import Link from "next/link";

interface Props {
  role: string;
  userEmail: string;
}

export default function AdminBackupClient({ role, userEmail }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stats = useQuery(api.adminBackup.getSystemDataStats);
  const backupData = useQuery(api.adminBackup.exportFullDatabaseBackup);
  const wipeDataMutation = useMutation(api.adminBackup.wipeOperationalData);
  const wipeBatchChunkMutation = useMutation(api.adminBackup.wipeBatchChunk);
  const restoreMutation = useMutation(api.adminBackup.restoreFullDatabaseBackup);

  const [downloading, setDownloading] = useState(false);
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [wiping, setWiping] = useState(false);

  // Import / Restore State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importJsonString, setImportJsonString] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);

  const REQUIRED_CONFIRMATION = "DELETE PERMANENTLY ALL DATA";

  // ── 1. HANDLE DOWNLOAD JSON BACKUP ──
  const handleDownloadBackup = () => {
    if (!backupData) {
      toast.error("Backup dataset is preparing. Please try again in a moment.");
      return;
    }

    try {
      setDownloading(true);
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);

      const link = document.createElement("a");
      link.href = url;
      link.download = `retailmind_backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Database backup downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate backup JSON file.");
    } finally {
      setDownloading(false);
    }
  };

  // ── 2. HANDLE FILE SELECTION FOR RESTORE ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Please select a valid .json backup file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        const dataObj = parsed.data || parsed;

        if (!dataObj || (typeof dataObj !== "object")) {
          throw new Error("Invalid backup format");
        }

        setImportFile(file);
        setImportJsonString(text);
        setImportPreview({
          metadata: parsed.metadata || null,
          productsCount: Array.isArray(dataObj.products) ? dataObj.products.length : 0,
          inventoryCount: Array.isArray(dataObj.inventory) ? dataObj.inventory.length : 0,
          suppliersCount: Array.isArray(dataObj.suppliers) ? dataObj.suppliers.length : 0,
          categoriesCount: Array.isArray(dataObj.categories) ? dataObj.categories.length : 0,
          locationsCount: Array.isArray(dataObj.locations) ? dataObj.locations.length : 0,
          poCount: Array.isArray(dataObj.purchaseOrders) ? dataObj.purchaseOrders.length : 0,
          alertsCount: Array.isArray(dataObj.alerts) ? dataObj.alerts.length : 0,
        });

        toast.success(`Loaded "${file.name}" ready for import!`);
      } catch (err) {
        toast.error("Invalid JSON backup file structure.");
        setImportFile(null);
        setImportJsonString(null);
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  // ── 3. HANDLE IMPORT / RESTORE MUTATION ──
  const handleExecuteRestore = async () => {
    if (!importJsonString) {
      toast.error("Please select a JSON backup file first.");
      return;
    }

    setImporting(true);
    try {
      const res = await restoreMutation({ backupJsonString: importJsonString });
      toast.success(res.message);

      // Reset import state
      setImportFile(null);
      setImportJsonString(null);
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to restore database from backup.");
    } finally {
      setImporting(false);
    }
  };

  // ── 4. HANDLE PERMANENT WIPE (CHUNKED FOR UNLIMITED RECORDS) ──
  const handleConfirmWipe = async () => {
    if (confirmationInput !== REQUIRED_CONFIRMATION) {
      toast.error("Confirmation text does not match!");
      return;
    }

    setWiping(true);
    try {
      let totalDeleted = 0;
      let hasMore = true;
      let iterations = 0;

      while (hasMore && iterations < 50) {
        iterations++;
        const res = await wipeBatchChunkMutation({
          confirmationCode: confirmationInput,
        });
        totalDeleted += res.deletedCount;
        hasMore = res.hasMore;
        if (res.deletedCount === 0) break;
      }

      toast.success(`Successfully wiped ${totalDeleted} operational records from the database! Admin credentials preserved.`);
      setWipeModalOpen(false);
      setConfirmationInput("");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to wipe database.");
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-8 w-full max-w-7xl mx-auto">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs font-bold px-3 py-1">
          Admin Security Area
        </Badge>
      </div>

      {/* ── HERO HEADER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white p-6 sm:p-8 rounded-xl shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Database className="w-7 h-7 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Database Backup & System Maintenance
                </h1>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-xs font-bold">
                  Convex Engine
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Export complete system backups, restore datasets from JSON files, or perform permanent database reset operations. Restricted to Administrators.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── REAL-TIME METRICS GRID ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Products</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats ? stats.productCount : "..."}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Inventory Units</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats ? stats.inventoryCount : "..."}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Suppliers</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats ? stats.supplierCount : "..."}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total System Records</p>
              <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {stats ? stats.totalRecords : "..."}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── CONTROLS SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. BACKUP EXPORT CARD */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  1. Export Backup
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Download full JSON backup of all database tables.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-2 space-y-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>Backup Format:</span>
                <span className="font-bold text-slate-900 dark:text-white">JSON (.json)</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>Tables Included:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">11 Tables</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>Status:</span>
                <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Export
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Backups contain products, inventory balances, suppliers, POs, movements, categories, and alerts.
            </p>
          </CardContent>

          <div className="p-6 pt-0">
            <Button
              onClick={handleDownloadBackup}
              disabled={downloading || !backupData}
              className="w-full h-11 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all gap-2"
            >
              {downloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Preparing JSON File...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Download Backup (.json)
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* 2. RESTORE / IMPORT BACKUP CARD */}
        <Card className="bg-white dark:bg-slate-900 border-indigo-500/30 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  2. Restore Backup Data
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Import a previously downloaded JSON backup file into DB.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-2 space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-4 border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/60 rounded-lg bg-indigo-500/5 dark:bg-indigo-500/10 cursor-pointer text-center transition-all space-y-2 group"
            >
              <Upload className="w-6 h-6 text-indigo-500 mx-auto group-hover:scale-110 transition-transform" />
              {importFile ? (
                <div>
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">{importFile.name}</p>
                  <p className="text-[11px] text-slate-400">Click to change JSON backup file</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Click to select backup JSON file</p>
                  <p className="text-[11px] text-slate-400">retailmind_backup_*.json</p>
                </div>
              )}
            </div>

            {importPreview && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                <p className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5" /> Backup Ready to Restore:
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-600 dark:text-slate-400">
                  <span>• Products: <b>{importPreview.productsCount}</b></span>
                  <span>• Inventory: <b>{importPreview.inventoryCount}</b></span>
                  <span>• Suppliers: <b>{importPreview.suppliersCount}</b></span>
                  <span>• POs: <b>{importPreview.poCount}</b></span>
                </div>
              </div>
            )}
          </CardContent>

          <div className="p-6 pt-0">
            <Button
              onClick={handleExecuteRestore}
              disabled={importing || !importJsonString}
              className="w-full h-11 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-500 shadow-md transition-all gap-2"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Importing Records...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Import & Restore Backup Data
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* 3. PERMANENT WIPE / DANGER ZONE CARD */}
        <Card className="bg-white dark:bg-slate-900 border-red-500/20 dark:border-red-500/30 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-red-600 dark:text-red-400">
                  3. Permanent Wipe
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Irreversibly delete operational supermarket data.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-2 space-y-4">
            <div className="p-4 rounded-lg bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 text-xs space-y-2 text-red-700 dark:text-red-300">
              <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>WARNING: IRREVERSIBLE</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Permanently purges products, inventory, suppliers, movements, POs, and alerts.
              </p>
              <div className="pt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                ✓ Preserves Admin user accounts.
              </div>
            </div>
          </CardContent>

          <div className="p-6 pt-0">
            <Button
              onClick={() => setWipeModalOpen(true)}
              className="w-full h-11 rounded-lg font-bold text-xs text-white bg-red-600 hover:bg-red-500 shadow-md transition-all gap-2"
            >
              <ShieldAlert className="w-4 h-4" /> Wipe Entire Database
            </Button>
          </div>
        </Card>
      </div>

      {/* ── SECURITY CONFIRMATION MODAL ── */}
      <Dialog open={wipeModalOpen} onOpenChange={setWipeModalOpen}>
        <DialogContent className="sm:max-w-md rounded-xl p-6 bg-white dark:bg-slate-900 border-red-500/30">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
              Confirm Permanent Database Wipe
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              You are about to permanently delete all operational data from RetailMind AI. This operation cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">To confirm, type the following phrase exactly:</p>
              <p className="font-mono font-bold text-red-600 dark:text-red-400 select-all">
                {REQUIRED_CONFIRMATION}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Confirmation Input
              </Label>
              <Input
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="DELETE PERMANENTLY ALL DATA"
                className="h-10 text-xs rounded-xl border-red-500/40 focus:border-red-500 font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setWipeModalOpen(false);
                setConfirmationInput("");
              }}
              className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmWipe}
              disabled={wiping || confirmationInput !== REQUIRED_CONFIRMATION}
              className="h-10 text-xs rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 transition-all gap-2"
            >
              {wiping ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Wiping Data...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" /> Confirm Permanent Wipe
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
