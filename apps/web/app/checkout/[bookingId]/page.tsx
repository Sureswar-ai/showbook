"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  BookingDto,
  CreatePaymentOrderResponse,
  VerifyPaymentResponse,
} from "@showbook/types";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Skeleton, Card } from "@/components/ui/primitives";
import { paiseToRupees, showTimeLabel } from "@/lib/utils/format";
import { FakePaymentModal } from "@/components/checkout/FakePaymentModal";
import { toast } from "sonner";
import { Tag, CheckCircle2 } from "lucide-react";

export default function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const [offerCode, setOfferCode] = useState("");
  const [offerApplied, setOfferApplied] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: booking, isLoading, refetch } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => api.get<BookingDto>(`/bookings/${bookingId}`),
    refetchInterval: false,
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      api.post<{ discountPaise: number; message: string }>(
        `/bookings/${bookingId}/apply-offer`,
        { code: offerCode }
      ),
    onSuccess: (data) => {
      toast.success(data.message);
      setOfferApplied(true);
      refetch();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const orderMutation = useMutation({
    mutationFn: () =>
      api.post<CreatePaymentOrderResponse>("/payments/create-order", {
        bookingIntentId: bookingId,
      }),
    onSuccess: (data) => {
      setOrderId(data.orderId);
      setModalOpen(true);
    },
    onError: (err) => toast.error((err as Error).message),
  });

  async function onVerify(outcome: "success" | "failure", method: string) {
    if (!orderId) return;
    const paymentId = "fake_pay_" + Math.random().toString(36).slice(2, 10);
    const signature = `fake_sig_${paymentId}`;
    try {
      const res = await api.post<VerifyPaymentResponse>("/payments/verify", {
        orderId,
        paymentId,
        signature,
        bookingIntentId: bookingId,
        simulatedOutcome: outcome,
        method,
      });
      setModalOpen(false);
      if (res.success && res.bookingId) {
        toast.success("Payment successful!");
        router.push(`/booking-confirmation/${res.bookingId}`);
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (isLoading || !booking) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Review & pay</h1>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={booking.moviePosterUrl} alt="" className="h-28 w-20 rounded object-cover" />
              <div className="flex-1">
                <div className="font-semibold">{booking.movieTitle}</div>
                <div className="text-sm text-gray-600">
                  {booking.show.theaterName} · {booking.show.screenName}
                </div>
                <div className="text-sm text-gray-600">
                  {showTimeLabel(booking.show.startTime)} · {booking.show.format} · {booking.show.language}
                </div>
                <div className="text-sm font-medium mt-1">
                  Seats: {booking.seats.map((s) => `${s.rowLabel}${s.seatNumber}`).join(", ")}
                </div>
              </div>
            </div>
          </Card>

          {booking.fnb.length > 0 && (
            <Card className="p-4">
              <div className="font-semibold mb-2">F&B</div>
              {booking.fnb.map((f) => (
                <div key={f.itemId} className="flex justify-between text-sm">
                  <span>
                    {f.name} × {f.quantity}
                  </span>
                  <span>{paiseToRupees(f.pricePaise)}</span>
                </div>
              ))}
            </Card>
          )}

          <Card className="p-4">
            <div className="font-semibold mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" /> Offers
            </div>
            {offerApplied && booking.offerCode ? (
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-semibold">{booking.offerCode}</span>
                <span>applied — saved {paiseToRupees(booking.discountPaise)}</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={offerCode}
                  onChange={(e) => setOfferCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (try FLAT150)"
                />
                <Button onClick={() => applyMutation.mutate()} disabled={!offerCode || applyMutation.isPending}>
                  Apply
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="font-semibold mb-2">Contact</div>
            <div className="text-sm text-gray-600">{booking.contactPhone ?? "Phone on file"}</div>
            <div className="text-sm text-gray-600">{booking.contactEmail ?? "Email on file"}</div>
          </Card>
        </div>

        <div>
          <Card className="p-4 sticky top-20">
            <div className="font-semibold mb-3">Price summary</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{paiseToRupees(booking.subtotalPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span>Convenience fee</span>
                <span>{paiseToRupees(booking.convenienceFeePaise)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST</span>
                <span>{paiseToRupees(booking.gstPaise)}</span>
              </div>
              {booking.discountPaise > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({booking.offerCode})</span>
                  <span>-{paiseToRupees(booking.discountPaise)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 my-3" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{paiseToRupees(booking.totalPaise)}</span>
            </div>
            <Button
              size="lg"
              className="w-full mt-4"
              onClick={() => orderMutation.mutate()}
              disabled={orderMutation.isPending}
            >
              {orderMutation.isPending ? "Starting payment…" : `Pay ${paiseToRupees(booking.totalPaise)}`}
            </Button>
            <div className="text-xs text-gray-500 mt-2 text-center">
              Cancellation up to 2h before showtime.
            </div>
          </Card>
        </div>
      </div>

      <FakePaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        amountPaise={booking.totalPaise}
        orderId={orderId ?? ""}
        onVerify={onVerify}
      />
    </div>
  );
}
