import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { BookingsService } from "./bookings.service";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import PDFDocument from "pdfkit";

@Controller("bookings")
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly prisma: PrismaService
  ) {}

  @Post("intent")
  async intent(
    @CurrentUser() user: AuthUser,
    @Body() body: {
      showId: string;
      seatIds: string[];
      contactPhone?: string;
      contactEmail?: string;
    }
  ) {
    return this.bookings.createIntent({
      userId: user.id,
      showId: body.showId,
      seatIds: body.seatIds,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
    });
  }

  @Post(":id/add-fnb")
  addFnb(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { items: { itemId: string; quantity: number }[] }
  ) {
    return this.bookings.addFnb({ userId: user.id, bookingId: id, items: body.items });
  }

  @Post(":id/apply-offer")
  apply(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { code: string }
  ) {
    return this.bookings.applyOffer({ userId: user.id, bookingId: id, code: body.code });
  }

  @Get("me")
  async mine(@CurrentUser() user: AuthUser, @Query("status") status?: string) {
    return this.bookings.listMine(user.id, status);
  }

  @Get(":id")
  async one(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.bookings.getById(id, user.id);
  }

  @Post(":id/cancel")
  async cancel(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.bookings.cancel({ userId: user.id, bookingId: id });
    return { success: true };
  }

  @Get(":id/ticket.pdf")
  async ticket(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Res() res: Response
  ) {
    const booking = await this.bookings.getById(id, user.id);
    if (!booking) throw new NotFoundException();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ticket-${booking.bookingNumber}.pdf"`
    );
    const doc = new PDFDocument({ size: "A5", margin: 36 });
    doc.pipe(res);
    doc.fontSize(22).text("ShowBook E-Ticket", { align: "center" }).moveDown(0.5);
    doc.fontSize(14).text(booking.movieTitle, { align: "center" }).moveDown(0.5);
    doc.fontSize(11).text(`Booking #${booking.bookingNumber}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(11)
      .text(`Theater:   ${booking.show.theaterName}`)
      .text(`Screen:    ${booking.show.screenName}`)
      .text(`Show time: ${new Date(booking.show.startTime).toLocaleString()}`)
      .text(`Format:    ${booking.show.format}  (${booking.show.language})`)
      .text(`Seats:     ${booking.seats.map((s) => `${s.rowLabel}${s.seatNumber}`).join(", ")}`);
    doc.moveDown();
    doc.text(`Subtotal:        ₹${(booking.subtotalPaise / 100).toFixed(2)}`);
    doc.text(`Convenience fee: ₹${(booking.convenienceFeePaise / 100).toFixed(2)}`);
    doc.text(`GST:             ₹${(booking.gstPaise / 100).toFixed(2)}`);
    if (booking.discountPaise > 0) {
      doc.text(`Discount (${booking.offerCode}): -₹${(booking.discountPaise / 100).toFixed(2)}`);
    }
    doc.moveDown();
    doc.fontSize(14).text(`Total: ₹${(booking.totalPaise / 100).toFixed(2)}`, { align: "right" });
    doc.moveDown(2);
    doc.fontSize(9).fillColor("gray").text(
      "Show this ticket at the theater entrance. Booking confirmations are non-transferable.",
      { align: "center" }
    );
    doc.end();
  }
}
