import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { createHmac, randomBytes } from "node:crypto";

const FAKE_SECRET = process.env.FAKE_GATEWAY_SECRET || "fake-gateway-demo-secret";

/**
 * A stand-in for Razorpay. Matches the create-order → verify → webhook shape.
 * The `simulatedOutcome` field on verify lets the demo UI trigger success or failure.
 */
@Injectable()
export class FakeGatewayService {
  private readonly logger = new Logger(FakeGatewayService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createOrder(params: {
    bookingId: string;
    amountPaise: number;
  }): Promise<{ orderId: string; amountPaise: number; currency: "INR" }> {
    const orderId = "fake_ord_" + randomBytes(8).toString("hex");
    await this.prisma.paymentIntent.create({
      data: {
        orderId,
        bookingId: params.bookingId,
        amountPaise: params.amountPaise,
        status: "CREATED",
      },
    });
    this.logger.log(`💳 Created fake order ${orderId} for booking ${params.bookingId} (₹${(params.amountPaise / 100).toFixed(2)})`);
    return { orderId, amountPaise: params.amountPaise, currency: "INR" };
  }

  /**
   * In real Razorpay the client signs the callback with its secret and we verify HMAC.
   * Here we accept a "signature" that's just `fake_sig_<paymentId>` — the real work is
   * looking up the payment intent and flipping its status.
   */
  async verify(params: {
    orderId: string;
    paymentId: string;
    signature: string;
    simulatedOutcome: "success" | "failure";
    method?: string;
  }): Promise<{ ok: boolean; bookingId: string | null; message: string }> {
    const expected = createHmac("sha256", FAKE_SECRET)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest("hex");
    // In demo mode, also accept the shortcut string "fake_sig_<paymentId>"
    if (params.signature !== expected && params.signature !== `fake_sig_${params.paymentId}`) {
      throw new BadRequestException("Invalid signature");
    }
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { orderId: params.orderId },
    });
    if (!intent) throw new BadRequestException("Unknown order");

    if (params.simulatedOutcome === "failure") {
      await this.prisma.paymentIntent.update({
        where: { orderId: params.orderId },
        data: { status: "FAILED", resolvedAt: new Date() },
      });
      if (intent.bookingId) {
        await this.prisma.payment.create({
          data: {
            bookingId: intent.bookingId,
            gateway: "FAKE",
            gatewayOrderId: params.orderId,
            gatewayPaymentId: params.paymentId,
            amountPaise: intent.amountPaise,
            status: "FAILED",
            method: params.method ?? null,
          },
        });
      }
      return { ok: false, bookingId: intent.bookingId, message: "Payment failed (simulated)" };
    }

    await this.prisma.paymentIntent.update({
      where: { orderId: params.orderId },
      data: { status: "PAID", resolvedAt: new Date() },
    });
    if (intent.bookingId) {
      await this.prisma.payment.create({
        data: {
          bookingId: intent.bookingId,
          gateway: "FAKE",
          gatewayOrderId: params.orderId,
          gatewayPaymentId: params.paymentId,
          amountPaise: intent.amountPaise,
          status: "PAID",
          method: params.method ?? null,
          paidAt: new Date(),
        },
      });
    }
    return { ok: true, bookingId: intent.bookingId, message: "Payment verified" };
  }

  /** Expose the signing shape so the client can construct a matching signature. */
  static makeSignature(orderId: string, paymentId: string): string {
    return createHmac("sha256", FAKE_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  }
}
