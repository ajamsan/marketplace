import { Badge } from "@/components/ui/card";
import { STALL_STATUS_LABEL } from "@/lib/format";

const toneByStatus: Record<string, "neutral" | "success" | "warning"> = {
  pending_review: "warning",
  active: "success",
  inactive: "neutral",
};

// Menampilkan status persetujuan stan sebagai label yang mudah dikenali.
export function StallStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={toneByStatus[status] ?? "neutral"}>
      {STALL_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
