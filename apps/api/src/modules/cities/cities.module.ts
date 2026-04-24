import { Controller, Get, Module, Query } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Public } from "../../common/decorators/public.decorator";

@Controller("cities")
class CitiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async list(@Query("top") top?: string) {
    const where = top === "true" ? { isTop: true } : {};
    const cities = await this.prisma.city.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    return cities.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      state: c.state,
      latitude: c.latitude ? Number(c.latitude) : null,
      longitude: c.longitude ? Number(c.longitude) : null,
      isTop: c.isTop,
    }));
  }

  @Public()
  @Get("detect")
  async detect() {
    // Demo: always return Mumbai. Real impl would use ip-to-geo.
    const city = await this.prisma.city.findFirst({ where: { slug: "mumbai" } });
    return city;
  }
}

@Module({ controllers: [CitiesController] })
export class CitiesModule {}
