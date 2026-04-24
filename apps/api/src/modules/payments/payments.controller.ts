import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Post,
} from "@nestjs/common";
import { FakeGatewayService } from "./fake-gateway.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BookingsService } from "../bookings/bookings.service";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { randomBytes } from "node:crypto";

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly gateway: FakeGatewayService,
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService
  ) {}

  @Post("create-order")
  async createOrder(
    @CurrentUser() user: AuthUser,
    @Body() body: { bookingIntentId: string }
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: body.bookingIntentId },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.userId !== user.id) throw new ForbiddenException();
    if (booking.status !== "PENDING") throw new BadRequestException("Booking not pending");

    const order = await this.gateway.createOrder({
      bookingId: booking.id,
      amountPaise: booking.totalPaise,
    });
    return { ...order, bookingIntentId: booking.id };
  }

  @Post("verify")
  async verify(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      orderId: string;
      paymentId: string;
      signature: string;
      bookingIntentId: string;
      simulatedOutcome: "success" | "failure";
      method?: string;
    }
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: body.bookingIntentId },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.userId !== user.id) throw new ForbiddenException();

    const paymentId = body.paymentId || "fake_pay_" + randomBytes(6).toString("hex");
    const result = await this.gateway.verify({
      orderId: body.orderId,
      paymentId,
      signature: body.signature,
      simulatedOutcome: body.simulatedOutcome,
      method: body.method,
    });
    if (result.ok) {
      await this.bookings.confirm({ bookingId: booking.id, paymentId });
      return { success: true, bookingId: booking.id, message: result.message };
    }
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: "FAILED" },
    });
    return { success: false, bookingId: booking.id, message: result.message };
  }

  /**
   * Webhook stub — in Razorpay a server-to-server call. Here it's just to show the
   * shape is in place; clicking "Simulate Success" in the UI doesn't actually hit
   * this endpoint. Useful for demo'ing the architecture.
   */
  @Post("webhook")
  async webhook(@Body() body: unknown) {
    // eslint-disable-next-line no-console
    console.log("[fake-webhook]", body);
    return { received: true };
  }
}
