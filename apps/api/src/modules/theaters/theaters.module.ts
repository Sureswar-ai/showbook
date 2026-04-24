import { Controller, Get, Module, NotFoundException, Param, Query } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Public } from "../../common/decorators/public.decorator";
import { parseArr } from "../../common/json-fields";

@Controller("theaters")
class TheatersController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async list(@Query("cityId") cityId?: string) {
    const where = cityId ? { cityId } : {};
    const theaters = await this.prisma.theater.findMany({ where, orderBy: { name: "asc" } });
    return theaters.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      chain: t.chain,
      cityId: t.cityId,
      address: t.address,
      latitude: t.latitude,
      longitude: t.longitude,
      amenities: parseArr(t.amenities),
    }));
  }

  @Public()
  @Get(":id")
  async detail(@Param("id") id: string) {
    const t = await this.prisma.theater.findUnique({
      where: { id },
      include: { screens: true, city: true },
    });
    if (!t) throw new NotFoundException("Theater not found");
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      chain: t.chain,
      cityId: t.cityId,
      cityName: t.city.name,
      address: t.address,
      latitude: t.latitude,
      longitude: t.longitude,
      amenities: parseArr(t.amenities),
      screens: t.screens.map((s) => ({
        id: s.id,
        name: s.name,
        totalSeats: s.totalSeats,
        formatsSupported: parseArr(s.formatsSupported),
      })),
    };
  }
}

@Module({ controllers: [TheatersController] })
export class TheatersModule {}
