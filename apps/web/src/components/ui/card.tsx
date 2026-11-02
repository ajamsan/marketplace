import { cn } from "@/lib/utils";

// Menyediakan wadah konsisten untuk mengelompokkan konten halaman.
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface p-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Menyusun judul kartu beserta keterangan dan aksi opsional.
export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const toneClass: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-muted-foreground border-border",
  accent: "bg-accent-soft text-foreground border-accent/40",
  success: "bg-success-soft text-foreground border-success/40",
  warning: "bg-warning-soft text-foreground border-warning/40",
  danger: "bg-danger-soft text-foreground border-danger/40",
  info: "bg-info-soft text-foreground border-info/40",
};

// Menampilkan label status dengan warna yang sesuai konteksnya.
export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
