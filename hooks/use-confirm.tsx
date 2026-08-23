import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmIntent = "default" | "danger" | "success" | "warning";

export const useConfirm = (
  title: string,
  message: string,
  intent: ConfirmIntent = "default"
): [() => any, () => Promise<boolean>] => {
  const [promise, setPromise] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const confirm = () => new Promise<boolean>((resolve) => {
    setPromise({ resolve });
  });

  const handleClose = () => {
    setPromise(null);
  };

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };

  const handleCancel = () => {
    promise?.resolve(false);
    handleClose();
  };

  const getIntentStyles = () => {
    switch (intent) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white focus:ring-red-600";
      case "success":
        return "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-600";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-600";
      default:
        return "bg-indigo-600 hover:bg-indigo-700 text-white";
    }
  };

  const ConfirmationDialog = () => (
    <AlertDialog open={promise !== null} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction className={getIntentStyles()} onClick={handleConfirm}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [ConfirmationDialog, confirm];
};
