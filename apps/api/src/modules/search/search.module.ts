import { Controller, Get, Module, Query } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Public } from "../../common/decorators/public.decorator";
import { parseArr } from "../../common/json-fields";

@Controller("search")
class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async search(@Query("q") q: string, @Query("cityId") cityId?: string) {
    return this.run(q, cityId, 10);
  }

  @Public()
  @Get("autocomplete")
  async autocomplete(@Query("q") q: string, @Query("cityId") cityId?: string) {
    return this.run(q, cityId, 5);
  }

  private async run(q: string, cityId: string | undefined, limitPerGroup: number) {
    const query = (q || "").trim();
    if (query.length < 1) return [];

    const [movies, events, theaters, cities] = await Promise.all([
      this.prisma.movie.findMany({
        where: { OR: [{ title: { contains: query } }, { synopsis: { contains: query } }] },
        take: limitPerGroup,
      }),
      this.prisma.event.findMany({
        where: { title: { contains: query } },
        take: limitPerGroup,
      }),
      this.prisma.theater.findMany({
        where: { name: { contains: query }, ...(cityId ? { cityId } : {}) },
        take: limitPerGroup,
      }),
      this.prisma.city.findMany({
        where: { name: { contains: query } },
        take: limitPerGroup,
      }),
    ]);

    return [
      ...movies.map((m) => ({
        type: "movie" as const,
        id: m.id,
        title: m.title,
        subtitle: parseArr(m.genres).join(" · "),
        imageUrl: m.posterUrl,
        url: `/movies/mumbai/${m.slug}/${m.id}`,
      })),
      ...events.map((e) => ({
        type: "event" as const,
        id: e.id,
        title: e.title,
        subtitle: e.eventType,
        imageUrl: e.bannerUrl,
        url: `/events/mumbai/${e.slug}/${e.id}`,
      })),
      ...theaters.map((t) => ({
        type: "theater" as const,
        id: t.id,
        title: t.name,
        subtitle: t.address,
        imageUrl: null,
        url: `/theaters/${t.id}`,
      })),
      ...cities.map((c) => ({
        type: "city" as const,
        id: c.id,
        title: c.name,
        subtitle: c.state,
        imageUrl: null,
        url: `/explore/${c.slug}`,
      })),
    ];
  }
}

@Module({ controllers: [SearchController] })
export class SearchModule {}
