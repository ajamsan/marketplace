import { Badge } from "@/components/ui/card";
import { AVAILABILITY_LABEL } from "@/lib/format";

// Menampilkan label ketersediaan produk dengan penanda visual yang sesuai.
export function AvailabilityBadge({ status }: { status: string }) {
  const label = AVAILABILITY_LABEL[status] ?? status;
  const tone =
    status === "available" ? "success" : status === "out_of_stock" ? "warning" : "danger";

  return <Badge tone={tone}>{label}</Badge>;
}
