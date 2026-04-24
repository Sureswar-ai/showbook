import { Controller, Get, Module, NotFoundException, Param, Query } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Public } from "../../common/decorators/public.decorator";
import { parseArr } from "../../common/json-fields";

type MovieRow = {
  id: string;
  title: string;
  originalTitle: string | null;
  slug: string;
  synopsis: string;
  runtimeMinutes: number;
  certificate: string;
  releaseDate: Date;
  languages: string;
  formats: string;
  genres: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string | null;
  imdbRating: number | null;
  userRating: number | null;
  status: string;
};

@Controller("movies")
class MoviesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async list(
    @Query("cityId") cityId?: string,
    @Query("status") status?: string,
    @Query("language") language?: string,
    @Query("format") format?: string,
    @Query("genre") genre?: string,
    @Query("q") q?: string,
    @Query("page") pageStr = "1",
    @Query("pageSize") pageSizeStr = "20",
    @Query("sort") sort: "popularity" | "release" | "rating" | "az" = "popularity"
  ) {
    void cityId;
    const page = Math.max(1, parseInt(pageStr, 10));
    const pageSize = Math.min(50, parseInt(pageSizeStr, 10));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (q) where.title = { contains: q };
    // language/format/genre are JSON strings — filter with substring match (demo scale)
    const ORs: Record<string, unknown>[] = [];
    if (language) ORs.push({ languages: { contains: `"${language}"` } });
    if (format) ORs.push({ formats: { contains: `"${format}"` } });
    if (genre) ORs.push({ genres: { contains: `"${genre}"` } });
    if (ORs.length > 0) where.AND = ORs;

    const orderBy =
      sort === "release"
        ? { releaseDate: "desc" as const }
        : sort === "rating"
        ? { userRating: "desc" as const }
        : sort === "az"
        ? { title: "asc" as const }
        : { createdAt: "desc" as const };

    const [items, total] = await Promise.all([
      this.prisma.movie.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.movie.count({ where }),
    ]);

    return {
      items: items.map(this.toDto),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
  }

  @Public()
  @Get("recommended")
  async recommended(@Query("limit") limitStr = "8") {
    const movies = await this.prisma.movie.findMany({
      where: { status: "NOW_SHOWING" },
      orderBy: { userRating: "desc" },
      take: parseInt(limitStr, 10),
    });
    return movies.map(this.toDto);
  }

  @Public()
  @Get(":id")
  async detail(@Param("id") id: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: {
        castCrew: { orderBy: { displayOrder: "asc" } },
        reviews: { where: { status: "APPROVED" } },
      },
    });
    if (!movie) throw new NotFoundException("Movie not found");
    const avg =
      movie.reviews.length === 0
        ? null
        : movie.reviews.reduce((s, r) => s + Number(r.rating), 0) / movie.reviews.length;
    return {
      ...this.toDto(movie),
      castCrew: movie.castCrew.map((c) => ({
        id: c.id,
        personName: c.personName,
        personImageUrl: c.personImageUrl,
        role: c.role,
        characterName: c.characterName,
        displayOrder: c.displayOrder,
      })),
      reviewCount: movie.reviews.length,
      averageRating: avg,
    };
  }

  @Public()
  @Get(":id/showtimes")
  async showtimes(
    @Param("id") movieId: string,
    @Query("cityId") cityId?: string,
    @Query("date") date?: string
  ) {
    const startOfDay = date ? new Date(date + "T00:00:00.000Z") : new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const shows = await this.prisma.show.findMany({
      where: {
        movieId,
        startTime: { gte: startOfDay, lt: endOfDay },
        status: "SCHEDULED",
        ...(cityId ? { screen: { theater: { cityId } } } : {}),
      },
      include: {
        screen: { include: { theater: true } },
        pricing: true,
        showSeats: { select: { status: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const byTheater = new Map<string, ReturnType<typeof this.mapShow>[]>();
    for (const s of shows) {
      const key = s.screen.theaterId;
      const arr = byTheater.get(key) ?? [];
      arr.push(this.mapShow(s));
      byTheater.set(key, arr);
    }

    const results: unknown[] = [];
    for (const [tid, showArr] of byTheater.entries()) {
      const t = shows.find((s) => s.screen.theaterId === tid)!.screen.theater;
      results.push({
        theater: {
          id: t.id,
          name: t.name,
          slug: t.slug,
          chain: t.chain,
          cityId: t.cityId,
          address: t.address,
          latitude: t.latitude,
          longitude: t.longitude,
          amenities: parseArr(t.amenities),
        },
        shows: showArr,
      });
    }
    return results;
  }

  private toDto = (m: MovieRow) => ({
    id: m.id,
    title: m.title,
    originalTitle: m.originalTitle,
    slug: m.slug,
    synopsis: m.synopsis,
    runtimeMinutes: m.runtimeMinutes,
    certificate: m.certificate,
    releaseDate: m.releaseDate.toISOString().slice(0, 10),
    languages: parseArr(m.languages),
    formats: parseArr(m.formats),
    genres: parseArr(m.genres),
    posterUrl: m.posterUrl,
    backdropUrl: m.backdropUrl,
    trailerUrl: m.trailerUrl,
    imdbRating: m.imdbRating,
    userRating: m.userRating,
    status: m.status,
  });

  private mapShow(s: {
    id: string;
    movieId: string;
    screenId: string;
    startTime: Date;
    endTime: Date;
    language: string;
    format: string;
    status: string;
    screen: { theaterId: string; name: string; theater: { name: string } };
    pricing: { basePricePaise: number; convenienceFeePaise: number }[];
    showSeats: { status: string }[];
  }) {
    const prices = s.pricing.map((p) => p.basePricePaise);
    const available = s.showSeats.filter((ss) => ss.status === "AVAILABLE").length;
    return {
      id: s.id,
      movieId: s.movieId,
      screenId: s.screenId,
      theaterId: s.screen.theaterId,
      theaterName: s.screen.theater.name,
      screenName: s.screen.name,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      language: s.language,
      format: s.format,
      status: s.status,
      availableSeatCount: available,
      totalSeatCount: s.showSeats.length,
      minPricePaise: prices.length ? Math.min(...prices) : 0,
      maxPricePaise: prices.length ? Math.max(...prices) : 0,
    };
  }
}

@Module({ controllers: [MoviesController] })
export class MoviesModule {}
