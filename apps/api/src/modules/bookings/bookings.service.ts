import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SeatLockService } from "../shows/seat-lock.service";
import { NotificationsService } from "../notifications/notifications.module";
import { randomBytes } from "node:crypto";

const GST_RATE = 0.18; // 18% GST applied only to convenience fee (per PRD §16)

function bookingNumber(): string {
  return "BMS-" + randomBytes(3).toString("hex").toUpperCase();
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seatLock: SeatLockService,
    private readonly notifications: NotificationsService
  ) {}

  async createIntent(params: {
    userId: string;
    showId: string;
    seatIds: string[];
    contactPhone?: string;
    contactEmail?: string;
  }) {
    const { userId, showId, seatIds } = params;
    if (seatIds.length === 0) throw new BadRequestException("Select at least one seat");

    const show = await this.prisma.show.findUnique({
      where: { id: showId },
      include: { pricing: true, screen: { include: { seats: true } } },
    });
    if (!show) throw new NotFoundException("Show not found");

    // Pull seat -> category, compute subtotal + convenience
    const seats = await this.prisma.seat.findMany({
      where: { id: { in: seatIds } },
      include: { category: true },
    });
    if (seats.length !== seatIds.length) throw new BadRequestException("Invalid seat IDs");

    const pricingByCat = new Map(show.pricing.map((p) => [p.categoryId, p]));
    let subtotal = 0;
    let convenience = 0;
    const seatPrices: { seatId: string; pricePaise: number }[] = [];
    for (const s of seats) {
      const p = pricingByCat.get(s.categoryId);
      if (!p) throw new BadRequestException("No pricing for seat category");
      subtotal += p.basePricePaise;
      convenience += p.convenienceFeePaise;
      seatPrices.push({ seatId: s.id, pricePaise: p.basePricePaise });
    }
    const gst = Math.round(convenience * GST_RATE);
    const total = subtotal + convenience + gst;

    const booking = await this.prisma.booking.create({
      data: {
        bookingNumber: bookingNumber(),
        userId,
        showId,
        status: "PENDING",
        subtotalPaise: subtotal,
        convenienceFeePaise: convenience,
        gstPaise: gst,
        discountPaise: 0,
        totalPaise: total,
        contactPhone: params.contactPhone ?? null,
        contactEmail: params.contactEmail ?? null,
        lockExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        seats: {
          create: seatPrices.map((sp) => ({
            seatId: sp.seatId,
            pricePaise: sp.pricePaise,
          })),
        },
      },
      include: { seats: true },
    });

    return this.getById(booking.id, userId);
  }

  async addFnb(params: {
    userId: string;
    bookingId: string;
    items: { itemId: string; quantity: number }[];
  }) {
    const booking = await this.assertOwned(params.bookingId, params.userId);
    if (booking.status !== "PENDING") throw new BadRequestException("Booking is not pending");

    // Wipe previous F&B
    await this.prisma.bookingFnb.deleteMany({ where: { bookingId: booking.id } });

    let fnbTotal = 0;
    if (params.items.length > 0) {
      const items = await this.prisma.fnbItem.findMany({
        where: { id: { in: params.items.map((i) => i.itemId) } },
      });
      const byId = new Map(items.map((i) => [i.id, i]));
      for (const line of params.items) {
        const item = byId.get(line.itemId);
        if (!item) continue;
        const price = item.pricePaise * line.quantity;
        fnbTotal += price;
        await this.prisma.bookingFnb.create({
          data: {
            bookingId: booking.id,
            itemId: item.id,
            quantity: line.quantity,
            pricePaise: price,
          },
        });
      }
    }

    // Recompute totals: subtotal = seat subtotal + fnb; GST still only on convenience
    const seatSubtotal = booking.subtotalPaise - (await this.currentFnbTotal(booking.id, true));
    const newSubtotal = seatSubtotal + fnbTotal;
    const total = newSubtotal + booking.convenienceFeePaise + booking.gstPaise - booking.discountPaise;

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { subtotalPaise: newSubtotal, totalPaise: total },
    });

    return this.getById(booking.id, params.userId);
  }

  /**
   * Returns the F&B total already attached to the booking.
   * If `excludeNew` is true, returns the seat-only subtotal contribution (i.e. 0),
   * but we pass the prior subtotal-minus-fnb logic via the caller.
   * Here we simply read BookingFnb rows.
   */
  private async currentFnbTotal(bookingId: string, _excludeNew: boolean): Promise<number> {
    const rows = await this.prisma.bookingFnb.findMany({ where: { bookingId } });
    return rows.reduce((s, r) => s + r.pricePaise, 0);
  }

  async applyOffer(params: {
    userId: string;
    bookingId: string;
    code: string;
  }): Promise<{ discountPaise: number; message: string }> {
    const booking = await this.assertOwned(params.bookingId, params.userId);
    if (booking.status !== "PENDING") throw new BadRequestException("Booking is not pending");

    const offer = await this.prisma.offer.findUnique({
      where: { code: params.code.trim().toUpperCase() },
    });
    const now = new Date();
    if (!offer || !offer.isActive || offer.validFrom > now || offer.validTo < now) {
      throw new BadRequestException("Offer invalid or expired");
    }
    const orderAmount = booking.subtotalPaise + booking.convenienceFeePaise + booking.gstPaise;
    if (orderAmount < offer.minOrderPaise) {
      throw new BadRequestException(`Minimum order ₹${(offer.minOrderPaise / 100).toFixed(0)}`);
    }
    const used = await this.prisma.userOffer.count({
      where: { userId: params.userId, offerId: offer.id },
    });
    if (used >= offer.perUserLimit) {
      throw new BadRequestException("You've already used this offer");
    }
    let discount = 0;
    if (offer.discountType === "FLAT") discount = offer.discountValue;
    else if (offer.discountType === "PERCENTAGE")
      discount = Math.round((orderAmount * offer.discountValue) / 100);
    if (offer.maxDiscountPaise) discount = Math.min(discount, offer.maxDiscountPaise);
    discount = Math.min(discount, orderAmount);

    const total = orderAmount - discount;
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { offerCode: offer.code, discountPaise: discount, totalPaise: total },
    });
    return { discountPaise: discount, message: `₹${(discount / 100).toFixed(0)} off applied` };
  }

  async confirm(params: { bookingId: string; paymentId: string }): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: { seats: true },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.status === "CONFIRMED") return;

    const qrPayload = {
      bookingNumber: booking.bookingNumber,
      showId: booking.showId,
      seats: booking.seats.map((s) => s.seatId),
      iat: Date.now(),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          qrCodeData: JSON.stringify(qrPayload),
        },
      });
      // Mark show_seats as BOOKED
      await tx.showSeat.updateMany({
        where: {
          showId: booking.showId,
          seatId: { in: booking.seats.map((s) => s.seatId) },
        },
        data: {
          status: "BOOKED",
          bookingId: booking.id,
          lockedUntil: null,
          lockedByUserId: null,
        },
      });
      // Record offer usage if applicable
      if (booking.offerCode) {
        const offer = await tx.offer.findUnique({ where: { code: booking.offerCode } });
        if (offer) {
          await tx.userOffer.create({
            data: { userId: booking.userId, offerId: offer.id, bookingId: booking.id },
          });
        }
      }
    });

    // Remove Redis locks and broadcast
    await this.seatLock.confirmSeats({
      showId: booking.showId,
      seatIds: booking.seats.map((s) => s.seatId),
    });

    // In-app notification stands in for email/SMS
    await this.notifications.send({
      userId: booking.userId,
      type: "BOOKING_CONFIRMED",
      title: "Booking confirmed!",
      body: `Your tickets (${booking.bookingNumber}) are ready. Show the QR code at the theater.`,
      metadata: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
    });
  }

  async cancel(params: { userId: string; bookingId: string }): Promise<void> {
    const booking = await this.assertOwned(params.bookingId, params.userId);
    if (booking.status === "CANCELLED") return;
    if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
      throw new BadRequestException("Booking cannot be cancelled");
    }
    // Policy: up to 2h before showtime (per PRD §6.13). For demo we allow any time.
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      await tx.showSeat.updateMany({
        where: { bookingId: booking.id },
        data: { status: "AVAILABLE", bookingId: null },
      });
      // Refund minus convenience fee
      const refundAmount = booking.totalPaise - booking.convenienceFeePaise;
      if (refundAmount > 0) {
        await tx.refund.create({
          data: {
            bookingId: booking.id,
            amountPaise: refundAmount,
            status: "PROCESSED",
            reason: "User cancellation",
          },
        });
      }
    });
    // Tell other clients watching the show map
    const freedSeats = await this.prisma.bookingSeat.findMany({
      where: { bookingId: booking.id },
      select: { seatId: true },
    });
    await this.seatLock.confirmSeats({
      showId: booking.showId,
      seatIds: [],
    });
    // Emit released event directly via pub/sub so open seat maps refresh
    const seatIds = freedSeats.map((s) => s.seatId);
    if (seatIds.length > 0) {
      await this.seatLock["redis"]?.publisher.publish(
        "seat-events",
        JSON.stringify({ type: "released", showId: booking.showId, seatIds })
      );
    }
    await this.notifications.send({
      userId: booking.userId,
      type: "BOOKING_CANCELLED",
      title: "Booking cancelled",
      body: `Booking ${booking.bookingNumber} was cancelled. Refund will be processed.`,
      metadata: { bookingId: booking.id },
    });
  }

  async listMine(userId: string, status?: string) {
    const where: Record<string, unknown> = { userId };
    if (status === "upcoming") {
      where.status = "CONFIRMED";
      where.show = { startTime: { gte: new Date() } };
    } else if (status === "past") {
      where.status = "CONFIRMED";
      where.show = { startTime: { lt: new Date() } };
    } else if (status === "cancelled") {
      where.status = "CANCELLED";
    }
    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        seats: { include: { seat: { include: { category: true } } } },
        fnb: { include: { item: true } },
        show: {
          include: {
            movie: true,
            screen: { include: { theater: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return bookings.map((b) => this.toDto(b));
  }

  async getById(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        seats: { include: { seat: { include: { category: true } } } },
        fnb: { include: { item: true } },
        show: {
          include: {
            movie: true,
            screen: { include: { theater: true } },
          },
        },
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.userId !== userId) throw new ForbiddenException("Not your booking");
    return this.toDto(booking);
  }

  private async assertOwned(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.userId !== userId) throw new ForbiddenException("Not your booking");
    return booking;
  }

  private toDto(b: {
    id: string;
    bookingNumber: string;
    userId: string;
    showId: string;
    status: string;
    subtotalPaise: number;
    convenienceFeePaise: number;
    gstPaise: number;
    discountPaise: number;
    totalPaise: number;
    offerCode: string | null;
    qrCodeData: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    createdAt: Date;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
    seats: { seatId: string; pricePaise: number; seat: { rowLabel: string; seatNumber: number; category: { name: string } } }[];
    fnb: { itemId: string; quantity: number; pricePaise: number; item: { name: string } }[];
    show: {
      id: string;
      startTime: Date;
      endTime: Date;
      language: string;
      format: string;
      status: string;
      movieId: string;
      screenId: string;
      movie: { title: string; posterUrl: string };
      screen: { name: string; theater: { id: string; name: string } };
    };
  }) {
    return {
      id: b.id,
      bookingNumber: b.bookingNumber,
      userId: b.userId,
      showId: b.showId,
      status: b.status,
      subtotalPaise: b.subtotalPaise,
      convenienceFeePaise: b.convenienceFeePaise,
      gstPaise: b.gstPaise,
      discountPaise: b.discountPaise,
      totalPaise: b.totalPaise,
      offerCode: b.offerCode,
      qrCodeData: b.qrCodeData,
      contactPhone: b.contactPhone,
      contactEmail: b.contactEmail,
      createdAt: b.createdAt.toISOString(),
      confirmedAt: b.confirmedAt?.toISOString() ?? null,
      cancelledAt: b.cancelledAt?.toISOString() ?? null,
      seats: b.seats.map((s) => ({
        seatId: s.seatId,
        rowLabel: s.seat.rowLabel,
        seatNumber: s.seat.seatNumber,
        categoryName: s.seat.category.name,
        pricePaise: s.pricePaise,
      })),
      fnb: b.fnb.map((f) => ({
        itemId: f.itemId,
        name: f.item.name,
        quantity: f.quantity,
        pricePaise: f.pricePaise,
      })),
      show: {
        id: b.show.id,
        movieId: b.show.movieId,
        screenId: b.show.screenId,
        theaterId: b.show.screen.theater.id,
        theaterName: b.show.screen.theater.name,
        screenName: b.show.screen.name,
        startTime: b.show.startTime.toISOString(),
        endTime: b.show.endTime.toISOString(),
        language: b.show.language,
        format: b.show.format,
        status: b.show.status,
        availableSeatCount: 0,
        totalSeatCount: 0,
        minPricePaise: 0,
        maxPricePaise: 0,
      },
      movieTitle: b.show.movie.title,
      moviePosterUrl: b.show.movie.posterUrl,
    };
  }
}
