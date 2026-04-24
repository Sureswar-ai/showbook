import { Module } from "@nestjs/common";
import { ShowsController } from "./shows.controller";
import { SeatLockService } from "./seat-lock.service";
import { SeatGateway } from "./seat.gateway";

@Module({
  controllers: [ShowsController],
  providers: [SeatLockService, SeatGateway],
  exports: [SeatLockService],
})
export class ShowsModule {}
