import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { FakeGatewayService } from "./fake-gateway.service";
import { BookingsModule } from "../bookings/bookings.module";

@Module({
  imports: [BookingsModule],
  controllers: [PaymentsController],
  providers: [FakeGatewayService],
  exports: [FakeGatewayService],
})
export class PaymentsModule {}
