import { Badge } from "@/components/ui/card";
import { orderStatusLabel } from "@/lib/format";

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
