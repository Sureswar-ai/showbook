import { BadRequestException, Body, Controller, Get, Module, Post } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";

@Controller("offers")
class OffersController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async active() {
    const now = new Date();
    const offers = await this.prisma.offer.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validTo: { gte: now },
      },
      orderBy: { code: "asc" },
    });
    return offers.map((o) => ({
      id: o.id,
      code: o.code,
      title: o.title,
      description: o.description,
      discountType: o.discountType,
      discountValue: o.discountValue,
      maxDiscountPaise: o.maxDiscountPaise,
      minOrderPaise: o.minOrderPaise,
      validFrom: o.validFrom.toISOString(),
      validTo: o.validTo.toISOString(),
      isActive: o.isActive,
    }));
  }

  @Post("validate")
  async validate(
    @CurrentUser() user: AuthUser,
    @Body() body: { code: string; bookingIntentId?: string; orderAmountPaise?: number }
  ) {
    const code = (body.code || "").trim().toUpperCase();
    if (!code) throw new BadRequestException("Code required");
    const offer = await this.prisma.offer.findUnique({ where: { code } });
    const now = new Date();
    if (!offer || !offer.isActive || offer.validFrom > now || offer.validTo < now) {
      return { valid: false, discountPaise: 0, message: "Offer invalid or expired" };
    }

    // Determine order amount
    let amount = body.orderAmountPaise ?? 0;
    if (!amount && body.bookingIntentId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: body.bookingIntentId },
        select: { subtotalPaise: true, convenienceFeePaise: true, gstPaise: true },
      });
      if (booking) amount = booking.subtotalPaise + booking.convenienceFeePaise + booking.gstPaise;
    }
    if (amount < offer.minOrderPaise) {
      return {
        valid: false,
        discountPaise: 0,
        message: `Order must be at least ₹${(offer.minOrderPaise / 100).toFixed(0)}`,
      };
    }

    // Per-user usage cap
    const used = await this.prisma.userOffer.count({
      where: { userId: user.id, offerId: offer.id },
    });
    if (used >= offer.perUserLimit) {
      return { valid: false, discountPaise: 0, message: "You've already used this offer" };
    }

    let discount = 0;
    if (offer.discountType === "FLAT") discount = offer.discountValue;
    else if (offer.discountType === "PERCENTAGE")
      discount = Math.round((amount * offer.discountValue) / 100);
    if (offer.maxDiscountPaise) discount = Math.min(discount, offer.maxDiscountPaise);
    discount = Math.min(discount, amount);

    return {
      valid: true,
      discountPaise: discount,
      message: `₹${(discount / 100).toFixed(0)} off applied`,
      offer: {
        id: offer.id,
        code: offer.code,
        title: offer.title,
        description: offer.description,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        maxDiscountPaise: offer.maxDiscountPaise,
        minOrderPaise: offer.minOrderPaise,
        validFrom: offer.validFrom.toISOString(),
        validTo: offer.validTo.toISOString(),
        isActive: offer.isActive,
      },
    };
  }
}

@Module({ controllers: [OffersController] })
export class OffersModule {}
