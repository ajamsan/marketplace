"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Dialog konfirmasi sederhana: fokus di dalam, ditutup dengan Escape,
 * dan aksi penting di dalamnya harus ditegaskan secara eksplisit (PRD §7).
 */
export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl outline-none",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-danger hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <h2 id="dialog-title" className="text-base font-semibold text-foreground pr-8">
          {title}
        </h2>
        {description ? (
          <p id="dialog-description" className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-4 flex flex-col gap-3">{children}</div> : null}
      </div>
    </div>
  );
}
