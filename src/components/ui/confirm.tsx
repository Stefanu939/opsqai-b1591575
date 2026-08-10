import { useEffect, useState } from "react";
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

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions get danger styling. Defaults to true. */
  destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let current: PendingConfirm | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/**
 * Accessible, themed replacement for `window.confirm` on destructive or
 * sensitive actions. Requires `<ConfirmHost />` mounted once at the app root.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  // A second request while one is open resolves the first as cancelled.
  current?.resolve(false);
  return new Promise<boolean>((resolve) => {
    current = { ...options, resolve };
    emit();
  });
}

function settle(ok: boolean) {
  current?.resolve(ok);
  current = null;
  emit();
}

export function ConfirmHost() {
  const [pending, setPending] = useState<PendingConfirm | null>(current);

  useEffect(() => {
    const sync = () => setPending(current);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return (
    <AlertDialog open={pending !== null} onOpenChange={(open) => !open && settle(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
          {pending?.description ? (
            <AlertDialogDescription>{pending.description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>
            {pending?.cancelLabel ?? "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => settle(true)}
            className={
              pending?.destructive === false
                ? undefined
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }
          >
            {pending?.confirmLabel ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
