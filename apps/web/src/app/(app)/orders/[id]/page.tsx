"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { getOrder } from "@/features/orders/api";
import { OrderDetail } from "@/features/orders/order-detail";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { ApiError } from "@/lib/api/client";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const order = useQuery({
    queryKey: ["orders", id],
    queryFn: () => getOrder(id),
  });

  const errorMessage =
    order.error instanceof ApiError ? order.error.message : "Gagal memuat detail pesanan.";

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/orders"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke daftar pesanan
      </Link>

      {order.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : order.isError || !order.data ? (
        <ErrorState
          message={errorMessage}
          onRetry={() => {
            void order.refetch();
          }}
        />
      ) : (
        <OrderDetail order={order.data} />
      )}
    </div>
  );
}
