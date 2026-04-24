import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { SeatLockService } from "./seat-lock.service";
import { parseJson } from "../../common/json-fields";
import { randomUUID } from "node:crypto";

@Controller("shows")
export class ShowsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seatLock: SeatLockService
  ) {}

  @Public()
  @Get(":id")
  async detail(@Param("id") id: string) {
    const show = await this.prisma.show.findUnique({
      where: { id },
      include: {
        movie: true,
        screen: { include: { theater: true } },
        pricing: true,
      },
    });
    if (!show) throw new NotFoundException("Show not found");
    return {
      id: show.id,
      movie: {
        id: show.movie.id,
        title: show.movie.title,
        slug: show.movie.slug,
        posterUrl: show.movie.posterUrl,
        certificate: show.movie.certificate,
        runtimeMinutes: show.movie.runtimeMinutes,
      },
      theater: {
        id: show.screen.theater.id,
        name: show.screen.theater.name,
        address: show.screen.theater.address,
      },
      screenName: show.screen.name,
      startTime: show.startTime.toISOString(),
      endTime: show.endTime.toISOString(),
      language: show.language,
      format: show.format,
      status: show.status,
      pricing: show.pricing.map((p) => ({
        categoryId: p.categoryId,
        basePricePaise: p.basePricePaise,
        convenienceFeePaise: p.convenienceFeePaise,
      })),
    };
  }

  @Public()
  @Get(":id/seats")
  async seatLayout(@Param("id") showId: string, @Query("userId") userIdParam?: string) {
    const show = await this.prisma.show.findUnique({
      where: { id: showId },
      include: {
        screen: {
          include: {
            seatCategories: { orderBy: { displayOrder: "asc" } },
            seats: true,
          },
        },
        pricing: true,
        showSeats: true,
      },
    });
    if (!show) throw new NotFoundException("Show not found");

    const categoryMap = new Map(show.pricing.map((p) => [p.categoryId, p]));
    const showSeatMap = new Map(show.showSeats.map((ss) => [ss.seatId, ss]));
    const locks = await this.seatLock.currentLocks(
      showId,
      show.screen.seats.map((s) => s.id)
    );

    const seats = show.screen.seats.map((s) => {
      const ss = showSeatMap.get(s.id);
      const lockValue = locks[s.id];
      let status: "AVAILABLE" | "LOCKED" | "BOOKED" = "AVAILABLE";
      let lockedByMe = false;
      if (ss?.status === "BOOKED") status = "BOOKED";
      else if (lockValue) {
        status = "LOCKED";
        if (userIdParam && lockValue.endsWith(`:${userIdParam}`)) lockedByMe = true;
      }
      return {
        id: s.id,
        rowLabel: s.rowLabel,
        seatNumber: s.seatNumber,
        categoryId: s.categoryId,
        isAccessible: s.isAccessible,
        status,
        lockedByMe,
      };
    });

    const layout = parseJson<{ rows: number; cols: number; aisles: { afterCol: number }[] }>(
      show.screen.layoutJson,
      { rows: 0, cols: 0, aisles: [] }
    );

    return {
      showId: show.id,
      screen: { rows: layout.rows, cols: layout.cols },
      categories: show.screen.seatCategories.map((c) => {
        const p = categoryMap.get(c.id);
        return {
          id: c.id,
          name: c.name,
          colorHex: c.colorHex,
          displayOrder: c.displayOrder,
          basePricePaise: p?.basePricePaise ?? 0,
          convenienceFeePaise: p?.convenienceFeePaise ?? 0,
        };
      }),
      seats,
      aisles: layout.aisles ?? [],
      maxSeatsPerBooking: 10,
    };
  }

  @Post(":id/lock-seats")
  async lockSeats(
    @CurrentUser() user: AuthUser,
    @Param("id") showId: string,
    @Body() body: { seatIds: string[] }
  ) {
    if (!Array.isArray(body.seatIds) || body.seatIds.length === 0) {
      throw new BadRequestException("seatIds required");
    }
    if (body.seatIds.length > 10) {
      throw new BadRequestException("Max 10 seats per booking");
    }

    const conflicts = await this.prisma.showSeat.findMany({
      where: { showId, seatId: { in: body.seatIds }, status: "BOOKED" },
      select: { seatId: true },
    });
    if (conflicts.length > 0) {
      return {
        bookingIntentId: null,
        lockedSeatIds: [],
        failedSeatIds: conflicts.map((c) => c.seatId),
        lockExpiresAt: new Date().toISOString(),
      };
    }

    const bookingIntentId = randomUUID();
    const { locked, failed, expiresAt } = await this.seatLock.lockSeats({
      showId,
      seatIds: body.seatIds,
      bookingIntentId,
      userId: user.id,
    });

    return {
      bookingIntentId: locked.length > 0 ? bookingIntentId : null,
      lockedSeatIds: locked,
      failedSeatIds: failed,
      lockExpiresAt: expiresAt.toISOString(),
    };
  }

  @Delete(":id/unlock-seats")
  async unlock(
    @CurrentUser() user: AuthUser,
    @Param("id") showId: string,
    @Body() body: { seatIds: string[]; bookingIntentId: string }
  ) {
    const { released } = await this.seatLock.releaseSeats({
      showId,
      seatIds: body.seatIds,
      bookingIntentId: body.bookingIntentId,
      userId: user.id,
    });
    return { released };
  }
}
