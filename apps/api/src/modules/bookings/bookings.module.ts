import { Module } from "@nestjs/common";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { ShowsModule } from "../shows/shows.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [ShowsModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
