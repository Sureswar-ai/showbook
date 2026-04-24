import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Module,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";

@Controller("reviews")
class ReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async list(
    @Query("movieId") movieId?: string,
    @Query("eventId") eventId?: string,
    @Query("sort") sort: "recent" | "helpful" = "recent"
  ) {
    const where: Record<string, unknown> = { status: "APPROVED" };
    if (movieId) where.movieId = movieId;
    if (eventId) where.eventId = eventId;

    const reviews = await this.prisma.review.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: sort === "helpful" ? { helpfulCount: "desc" } : { createdAt: "desc" },
      take: 50,
    });
    return reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name ?? "User",
      movieId: r.movieId,
      eventId: r.eventId,
      rating: Number(r.rating),
      text: r.text,
      helpfulCount: r.helpfulCount,
      status: r.status,
      verifiedBooking: r.bookingId !== null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: { movieId?: string; eventId?: string; bookingId?: string; rating: number; text?: string }
  ) {
    if (!body.movieId && !body.eventId) {
      throw new BadRequestException("movieId or eventId required");
    }
    if (body.rating < 0.5 || body.rating > 5) {
      throw new BadRequestException("Rating must be between 0.5 and 5");
    }
    // Verified-booking check
    if (body.bookingId) {
      const booking = await this.prisma.booking.findUnique({ where: { id: body.bookingId } });
      if (!booking || booking.userId !== user.id || booking.status !== "CONFIRMED") {
        throw new ForbiddenException("Booking not eligible for review");
      }
    }
    const rev = await this.prisma.review.create({
      data: {
        userId: user.id,
        movieId: body.movieId ?? null,
        eventId: body.eventId ?? null,
        bookingId: body.bookingId ?? null,
        rating: body.rating,
        text: body.text ?? null,
        status: "APPROVED",
      },
    });
    return { id: rev.id, created: true };
  }

  @Post(":id/helpful")
  async helpful(@Param("id") id: string) {
    await this.prisma.review.update({
      where: { id },
      data: { helpfulCount: { increment: 1 } },
    });
    return { success: true };
  }
}

@Module({ controllers: [ReviewsController] })
export class ReviewsModule {}
