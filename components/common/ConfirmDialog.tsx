"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * App-wide confirmation dialog, replacing the browser's `confirm()`.
 *
 * `confirm()` is unstyled, says "rebellabz-cms.vercel.app says", blocks the
 * main thread, and can be suppressed by the browser after repeated use. This
 * keeps the imperative `await confirm(...)` ergonomics so call sites read the
 * same, but renders in our own theme.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete X?", tone: "danger" }))) return;
 */

export type ConfirmTone = "danger" | "warning" | "default";

export type ConfirmOptions = {
  title: string;
  /** Supporting line under the title. */
  description?: string;
  /** Label for the confirming action. Defaults per tone. */
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

const TONE = {
  danger: {
    Icon: Trash2,
    iconCls: "text-red-600 bg-red-50 border-red-200",
    confirmCls: "bg-red-600 hover:bg-red-700 text-white",
    defaultLabel: "Delete",
  },
  warning: {
    Icon: AlertTriangle,
    iconCls: "text-amber-700 bg-amber-50 border-amber-200",
    confirmCls: "bg-amber-600 hover:bg-amber-700 text-white",
    defaultLabel: "Continue",
  },
  default: {
    Icon: Info,
    iconCls: "text-primary bg-accent border-border",
    confirmCls: "bg-primary hover:bg-indigo-600 text-white",
    defaultLabel: "Confirm",
  },
} as const;

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  // Held in a ref so closing via Escape / overlay click can still resolve the
  // promise — otherwise an awaited confirm() would hang forever.
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setPending({ ...opts, resolve });
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setPending(null);
  }, []);

  const tone = TONE[pending?.tone ?? "default"];
  const { Icon } = tone;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          // Escape, overlay click and the close button all route here.
          if (!open) settle(false);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center border ${tone.iconCls}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <DialogTitle className="text-base leading-6 break-words">
                  {pending?.title}
                </DialogTitle>
                {pending?.description && (
                  <DialogDescription className="mt-1.5 text-sm leading-5">
                    {pending.description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => settle(false)}
              className="border-slate-600 text-slate-200"
            >
              {pending?.cancelLabel ?? "Cancel"}
            </Button>
            <Button type="button" onClick={() => settle(true)} className={tone.confirmCls}>
              {pending?.confirmLabel ?? tone.defaultLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

/**
 * Returns an async `confirm(options)` resolving true/false.
 * Throws if used outside <ConfirmProvider> so a missing provider surfaces
 * immediately rather than as a dialog that silently never opens.
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within <ConfirmProvider>");
  }
  return ctx;
}
