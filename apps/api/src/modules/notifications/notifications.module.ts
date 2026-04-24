import { Controller, Get, Injectable, Module, Patch, Param } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { parseJson } from "../../common/json-fields";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async send(params: {
    userId: string;
    type: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  }
}

@Controller("notifications")
class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const notes = await this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return notes.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      metadata: parseJson<Record<string, unknown> | null>(n.metadata, null),
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  @Patch(":id/read")
  async read(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
