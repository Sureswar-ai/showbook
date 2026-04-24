import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Module,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Roles } from "../../common/decorators/roles.decorator";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

@Controller("admin")
@Roles("ADMIN", "CITY_ADMIN")
class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Movies ----
  @Get("movies")
  listMovies() {
    return this.prisma.movie.findMany({ orderBy: { createdAt: "desc" } });
  }

  @Post("movies")
  async createMovie(@Body() body: {
    title: string;
    synopsis: string;
    runtimeMinutes: number;
    certificate: string;
    releaseDate: string;
    languages: string[];
    formats: string[];
    genres: string[];
    posterUrl: string;
    backdropUrl: string;
    status?: string;
  }) {
    return this.prisma.movie.create({
      data: {
        title: body.title,
        slug: slugify(body.title),
        synopsis: body.synopsis,
        runtimeMinutes: body.runtimeMinutes,
        certificate: body.certificate,
        releaseDate: new Date(body.releaseDate),
        languages: body.languages,
        formats: body.formats,
        genres: body.genres,
        posterUrl: body.posterUrl,
        backdropUrl: body.backdropUrl,
        status: body.status ?? "UPCOMING",
      },
    });
  }

  @Put("movies/:id")
  updateMovie(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.prisma.movie.update({
      where: { id },
      data: body as Parameters<typeof this.prisma.movie.update>[0]["data"],
    });
  }

  @Delete("movies/:id")
  async deleteMovie(@Param("id") id: string) {
    await this.prisma.movie.delete({ where: { id } });
    return { success: true };
  }

  // ---- Theaters ----
  @Get("theaters")
  listTheaters() {
    return this.prisma.theater.findMany({ include: { city: true }, orderBy: { name: "asc" } });
  }

  @Post("theaters")
  async createTheater(@Body() body: {
    name: string;
    cityId: string;
    chain?: string;
    address: string;
    amenities?: string[];
  }) {
    return this.prisma.theater.create({
      data: {
        name: body.name,
        slug: slugify(body.name),
        chain: body.chain ?? null,
        cityId: body.cityId,
        address: body.address,
        amenities: body.amenities ?? [],
      },
    });
  }

  @Delete("theaters/:id")
  async deleteTheater(@Param("id") id: string) {
    await this.prisma.theater.delete({ where: { id } });
    return { success: true };
  }

  // ---- Shows ----
  @Get("shows")
  listShows(@Query("from") from?: string, @Query("to") to?: string) {
    const where: Record<string, unknown> = {};
    if (from || to) {
      where.startTime = {};
      if (from) (where.startTime as Record<string, Date>).gte = new Date(from);
      if (to) (where.startTime as Record<string, Date>).lt = new Date(to);
    }
    return this.prisma.show.findMany({
      where,
      include: {
        movie: { select: { title: true } },
        screen: { include: { theater: { select: { name: true } } } },
      },
      orderBy: { startTime: "asc" },
      take: 200,
    });
  }

  @Post("shows")
  async createShow(@Body() body: {
    movieId: string;
    screenId: string;
    startTime: string;
    language: string;
    format: string;
  }) {
    const movie = await this.prisma.movie.findUnique({ where: { id: body.movieId } });
    if (!movie) throw new BadRequestException("Movie not found");
    const screen = await this.prisma.screen.findUnique({
      where: { id: body.screenId },
      include: { seats: true, seatCategories: true },
    });
    if (!screen) throw new BadRequestException("Screen not found");
    const start = new Date(body.startTime);
    const end = new Date(start.getTime() + movie.runtimeMinutes * 60_000);
    const show = await this.prisma.show.create({
      data: {
        movieId: movie.id,
        screenId: screen.id,
        startTime: start,
        endTime: end,
        language: body.language,
        format: body.format,
        status: "SCHEDULED",
      },
    });
    // Default pricing (₹200 base / ₹25 convenience per category)
    for (const cat of screen.seatCategories) {
      await this.prisma.showPricing.create({
        data: {
          showId: show.id,
          categoryId: cat.id,
          basePricePaise: 20000,
          convenienceFeePaise: 2500,
        },
      });
    }
    await this.prisma.showSeat.createMany({
      data: screen.seats.map((s) => ({
        showId: show.id,
        seatId: s.id,
        status: "AVAILABLE",
      })),
    });
    return show;
  }

  @Delete("shows/:id")
  async deleteShow(@Param("id") id: string) {
    await this.prisma.show.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return { success: true };
  }

  // ---- Bookings ----
  @Get("bookings")
  listBookings(@Query("status") status?: string) {
    return this.prisma.booking.findMany({
      where: status ? { status } : {},
      include: {
        user: { select: { name: true, phone: true } },
        show: { include: { movie: { select: { title: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  // ---- Offers ----
  @Get("offers")
  listOffers() {
    return this.prisma.offer.findMany({ orderBy: { code: "asc" } });
  }

  @Post("offers")
  createOffer(@Body() body: Parameters<typeof this.prisma.offer.create>[0]["data"]) {
    return this.prisma.offer.create({ data: body });
  }

  @Put("offers/:id")
  updateOffer(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.prisma.offer.update({
      where: { id },
      data: body as Parameters<typeof this.prisma.offer.update>[0]["data"],
    });
  }

  // ---- Reports ----
  @Get("reports/revenue")
  async revenue(@Query("from") from?: string, @Query("to") to?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to ? new Date(to) : new Date();
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        confirmedAt: { gte: start, lte: end },
      },
      select: { totalPaise: true, confirmedAt: true, showId: true },
    });

    // Group by YYYY-MM-DD
    const byDay = new Map<string, { count: number; totalPaise: number }>();
    for (const b of bookings) {
      if (!b.confirmedAt) continue;
      const key = b.confirmedAt.toISOString().slice(0, 10);
      const curr = byDay.get(key) ?? { count: 0, totalPaise: 0 };
      curr.count++;
      curr.totalPaise += b.totalPaise;
      byDay.set(key, curr);
    }
    return {
      from: start.toISOString(),
      to: end.toISOString(),
      totalBookings: bookings.length,
      totalRevenuePaise: bookings.reduce((s, b) => s + b.totalPaise, 0),
      daily: [...byDay.entries()]
        .map(([date, v]) => ({ date, count: v.count, totalPaise: v.totalPaise }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  @Get("reports/occupancy")
  async occupancy() {
    const shows = await this.prisma.show.findMany({
      where: { status: "SCHEDULED", startTime: { gte: new Date() } },
      include: {
        movie: { select: { title: true } },
        screen: { include: { theater: { select: { name: true } } } },
        showSeats: { select: { status: true } },
      },
      orderBy: { startTime: "asc" },
      take: 50,
    });
    return shows.map((s) => {
      const total = s.showSeats.length;
      const booked = s.showSeats.filter((ss) => ss.status === "BOOKED").length;
      return {
        showId: s.id,
        movieTitle: s.movie.title,
        theaterName: s.screen.theater.name,
        screenName: s.screen.name,
        startTime: s.startTime.toISOString(),
        totalSeats: total,
        bookedSeats: booked,
        occupancyPct: total ? Math.round((booked / total) * 100) : 0,
      };
    });
  }

  // ---- Screens (helper for show creation UI) ----
  @Get("screens")
  listScreens(@Query("theaterId") theaterId?: string) {
    return this.prisma.screen.findMany({
      where: theaterId ? { theaterId } : {},
      include: { theater: { select: { name: true } } },
    });
  }
}

@Module({ controllers: [AdminController] })
export class AdminModule {}

// Prevent unused imports
void NotFoundException;
