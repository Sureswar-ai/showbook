"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, Skeleton, Badge } from "@/components/ui/primitives";
import { paiseToRupees } from "@/lib/utils/format";

interface AdminOffer {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrderPaise: number;
  isActive: boolean;
}

export default function AdminOffersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: () => api.get<AdminOffer[]>("/admin/offers"),
  });
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Offers</h1>
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {data?.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono font-bold text-brand">{o.code}</div>
                  <div className="font-semibold">{o.title}</div>
                </div>
                <Badge variant={o.isActive ? "success" : "outline"}>
                  {o.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-2">{o.description}</p>
              <div className="text-xs text-gray-500 mt-2">
                {o.discountType === "FLAT"
                  ? `${paiseToRupees(o.discountValue)} off`
                  : `${o.discountValue}% off`}
                {" · "}min {paiseToRupees(o.minOrderPaise)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
