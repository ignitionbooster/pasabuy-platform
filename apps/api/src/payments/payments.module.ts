import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaymongoService } from "./paymongo.service";
import { StripeService } from "./stripe.service";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymongoService, StripeService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
