import { Controller, Get, Module, NotFoundException, Param, Query } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Public } from "../../common/decorators/public.decorator";

@Controller("events")
class EventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async list(@Query("cityId") cityId?: string, @Query("type") type?: string) {
    const where: Record<string, unknown> = { status: "PUBLISHED" };
    if (type) where.eventType = type;
    const events = await this.prisma.event.findMany({
      where,
      include: {
        occurrences: {
          where: cityId ? { venue: { cityId } } : {},
          include: { venue: true },
          orderBy: { startTime: "asc" },
          take: 3,
        },
      },
    });
    return events
      .filter((e) => !cityId || e.occurrences.length > 0)
      .map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        eventType: e.eventType,
        description: e.description,
        durationHours: e.durationHours,
        ageRestriction: e.ageRestriction,
        bannerUrl: e.bannerUrl,
        occurrences: e.occurrences.map((o) => ({
          id: o.id,
          startTime: o.startTime.toISOString(),
          endTime: o.endTime?.toISOString() ?? null,
          seatingType: o.seatingType,
          venueName: o.venue.name,
          venueId: o.venueId,
          venueAddress: o.venue.address,
        })),
      }));
  }

  @Public()
  @Get(":id")
  async detail(@Param("id") id: string) {
    const e = await this.prisma.event.findUnique({
      where: { id },
      include: {
        occurrences: { include: { venue: true }, orderBy: { startTime: "asc" } },
      },
    });
    if (!e) throw new NotFoundException("Event not found");
    return {
      id: e.id,
      title: e.title,
      slug: e.slug,
      eventType: e.eventType,
      description: e.description,
      durationHours: e.durationHours,
      ageRestriction: e.ageRestriction,
      bannerUrl: e.bannerUrl,
      occurrences: e.occurrences.map((o) => ({
        id: o.id,
        startTime: o.startTime.toISOString(),
        endTime: o.endTime?.toISOString() ?? null,
        seatingType: o.seatingType,
        venueName: o.venue.name,
        venueId: o.venueId,
        venueAddress: o.venue.address,
      })),
    };
  }
}

@Module({ controllers: [EventsController] })
export class EventsModule {}
