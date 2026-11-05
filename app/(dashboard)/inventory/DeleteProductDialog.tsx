"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Ban, RefreshCw, Trash2 } from "lucide-react";

export interface DeleteTarget {
  productId: string;
  sku: string;
  name: string;
}

interface Props {
  target: DeleteTarget | null;
  token: string | null | undefined;
  onClose: () => void;
  onDeleted?: (target: DeleteTarget) => void;
}

function errorMessage(err: unknown) {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  if (err instanceof Error) return err.message.replace(/^[\s\S]*Uncaught ConvexError:\s*/, "").split("\n")[0];
  return "Failed to delete product.";
}

export default function DeleteProductDialog({ target, token, onClose, onDeleted }: Props) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      {/* Remount per product so typed SKU / state never leaks between rows */}
      {target && <DeleteProductBody key={target.productId} target={target} token={token} onClose={onClose} onDeleted={onDeleted} />}
    </Dialog>
  );
}

function DeleteProductBody({ target, token, onClose, onDeleted }: Props & { target: DeleteTarget }) {
  const [typedSku, setTypedSku] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deleteProduct = useMutation(api.inventory.deleteProductPermanently);
  const impact = useQuery(api.inventory.getProductDeletionImpact, {
    token: token ?? undefined,
    productId: target.productId as Id<"products">,
  });

  const blocked = (impact?.blockers.length ?? 0) > 0;
  const skuMatches = typedSku.trim() === target.sku;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProduct({
        token: token ?? undefined,
        productId: target.productId as Id<"products">,
        confirmSku: typedSku.trim(),
      });
      toast.success(`${target.name} (${target.sku}) was permanently deleted.`);
      onDeleted?.(target);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const c = impact?.counts;
  const items: [string, number | string][] = c
    ? [
        ["Stock records", `${c.locations} location${c.locations === 1 ? "" : "s"} · ${c.onHand} units on hand`],
        ["Stock movement history", c.stockMovementsCapped ? `${c.stockMovements}+` : c.stockMovements],
        ["Demand forecasts", c.forecasts],
        ["Reorder suggestions", c.reorderSuggestions],
        ["Price suggestions", c.priceSuggestions],
        ["Alerts", c.alerts],
      ]
    : [];

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-red-600">
          <Trash2 className="w-5 h-5" /> Delete product permanently
        </DialogTitle>
        <DialogDescription>
          <span className="font-semibold text-slate-900 dark:text-white">{target.name}</span>{" "}
          <span className="font-mono text-xs">({target.sku})</span> and everything linked to it will be removed from the
          database. This cannot be undone.
        </DialogDescription>
      </DialogHeader>

      {impact === undefined ? (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking what will be deleted...
        </div>
      ) : blocked ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5 text-xs text-amber-800 dark:text-amber-200">
          <p className="font-bold flex items-center gap-1.5">
            <Ban className="w-4 h-4" /> This product can&apos;t be deleted yet
          </p>
          <ul className="list-disc pl-5 space-y-1">
            {impact.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs space-y-1.5">
            <p className="font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Will be deleted
            </p>
            {items.map(([label, value]) => (
              <div key={label} className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>{label}</span>
                <span className="font-semibold tabular-nums">{value}</span>
              </div>
            ))}
            <p className="text-[11px] text-slate-500 pt-1">
              Past (delivered or cancelled) purchase orders keep their lines but will show this item as
              &quot;Unknown&quot;.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-sku" className="text-xs">
              Type <span className="font-mono font-bold">{target.sku}</span> to confirm
            </Label>
            <Input
              id="confirm-sku"
              value={typedSku}
              onChange={(e) => setTypedSku(e.target.value)}
              autoComplete="off"
              autoFocus
              placeholder={target.sku}
              onKeyDown={(e) => {
                if (e.key === "Enter" && skuMatches && !deleting) void handleDelete();
              }}
              className="font-mono text-sm"
            />
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={deleting}>
          {blocked ? "Close" : "Cancel"}
        </Button>
        {!blocked && (
          <Button
            onClick={() => void handleDelete()}
            disabled={!impact || !skuMatches || deleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
            Delete permanently
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
