import { Controller, Get, Module, Patch, Body } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";

@Controller("users")
class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  async me(@CurrentUser() user: AuthUser) {
    return this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, phone: true, email: true, name: true, role: true, cityId: true },
    });
  }

  @Patch("me")
  async update(
    @CurrentUser() user: AuthUser,
    @Body() body: { name?: string; email?: string; cityId?: string }
  ) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: body.name,
        email: body.email,
        cityId: body.cityId,
      },
      select: { id: true, phone: true, email: true, name: true, role: true, cityId: true },
    });
  }
}

@Module({ controllers: [UsersController] })
export class UsersModule {}
