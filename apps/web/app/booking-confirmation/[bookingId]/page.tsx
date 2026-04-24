"use client";
import { useQuery } from "@tanstack/react-query";
import { api, API_URL } from "@/lib/api/client";
import type { BookingDto } from "@showbook/types";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Skeleton } from "@/components/ui/primitives";
import { paiseToRupees, showTimeLabel } from "@/lib/utils/format";
import QRCode from "qrcode";
import { CheckCircle2, Download, Share2 } from "lucide-react";
import { authStorage } from "@/lib/api/client";
import Link from "next/link";

export default function BookingConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => api.get<BookingDto>(`/bookings/${bookingId}`),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!booking?.qrCodeData) return;
    QRCode.toDataURL(booking.qrCodeData, { width: 220, margin: 1 }).then(setQrDataUrl);
  }, [booking?.qrCodeData]);

  async function downloadTicket() {
    const token = authStorage.getAccess();
    const res = await fetch(`${API_URL}/bookings/${bookingId}/ticket.pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${booking?.bookingNumber || bookingId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function share() {
    const text = `🎬 I just booked ${booking?.movieTitle} at ${booking?.show.theaterName}! Join me.`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Share text copied to clipboard");
    }
  }

  if (isLoading || !booking) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center mb-6">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-2" />
        <h1 className="text-2xl md:text-3xl font-bold">Booking confirmed!</h1>
        <p className="text-gray-600">Booking #{booking.bookingNumber}</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0 flex justify-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR code" className="h-44 w-44 rounded-lg border" />
            ) : (
              <Skeleton className="h-44 w-44" />
            )}
          </div>
          <div className="flex-1 space-y-1 text-sm">
            <div className="text-lg font-semibold">{booking.movieTitle}</div>
            <div>{booking.show.theaterName} · {booking.show.screenName}</div>
            <div>{showTimeLabel(booking.show.startTime)}</div>
            <div>{booking.show.format} · {booking.show.language}</div>
            <div className="pt-2">
              <div className="text-xs text-gray-500">Seats</div>
              <div className="font-semibold">
                {booking.seats.map((s) => `${s.categoryName} ${s.rowLabel}${s.seatNumber}`).join(", ")}
              </div>
            </div>
            {booking.fnb.length > 0 && (
              <div className="pt-2">
                <div className="text-xs text-gray-500">F&B</div>
                <div className="font-semibold">
                  {booking.fnb.map((f) => `${f.name} ×${f.quantity}`).join(", ")}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{paiseToRupees(booking.subtotalPaise)}</span>
          </div>
          <div className="flex justify-between">
            <span>Convenience + GST</span>
            <span>{paiseToRupees(booking.convenienceFeePaise + booking.gstPaise)}</span>
          </div>
          {booking.discountPaise > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{paiseToRupees(booking.discountPaise)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1">
            <span>Total paid</span>
            <span>{paiseToRupees(booking.totalPaise)}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={downloadTicket} className="flex-1" variant="outline">
            <Download className="h-4 w-4 mr-1" /> Download PDF
          </Button>
          <Button onClick={share} className="flex-1" variant="outline">
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
        </div>
      </Card>

      <div className="mt-6 text-center text-xs text-gray-500">
        Show this QR code at the theater entrance. Cancellation available up to 2h before the show.
      </div>

      <div className="mt-4 text-center">
        <Link href="/profile" className="text-brand text-sm hover:underline">
          View all bookings →
        </Link>
      </div>
    </div>
  );
}
