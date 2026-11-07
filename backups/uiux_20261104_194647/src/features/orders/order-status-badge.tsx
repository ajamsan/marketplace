import { Badge } from "@/components/ui/card";
import { orderStatusLabel } from "@/lib/format";

// Menyajikan status pesanan sebagai label dan nada visual yang sesuai.
export function OrderStatusBadge({ status }: { status: string }) {
  const label = orderStatusLabel(status);
  const tone =
    status === "completed"
      ? "success"
      : status === "cancelled" || status === "rejected" || status === "expired"
        ? "danger"
        : status === "awaiting_payment"
          ? "warning"
          : "info";

  return <Badge tone={tone}>{label}</Badge>;
}
