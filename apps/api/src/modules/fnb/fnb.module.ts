import { Controller, Get, Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Public } from "../../common/decorators/public.decorator";

@Controller("fnb")
class FnbController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async list() {
    const items = await this.prisma.fnbItem.findMany({
      where: { available: true },
      orderBy: [{ category: "asc" }, { displayOrder: "asc" }],
    });
    return items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      category: i.category,
      pricePaise: i.pricePaise,
      imageUrl: i.imageUrl,
      available: i.available,
    }));
  }
}

@Module({ controllers: [FnbController] })
export class FnbModule {}
