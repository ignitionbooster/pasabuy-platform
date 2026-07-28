import { Body, Controller, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { IsEnum, IsUUID } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PaymentsService, PaymentProviderName } from "./payments.service";
import { PaymongoService } from "./paymongo.service";
import { StripeService } from "./stripe.service";

class InitiatePaymentDto {
  @IsUUID() rideId!: string;
  @IsEnum(["CASH", "GCASH", "PAYMONGO", "STRIPE"]) provider!: PaymentProviderName;
}

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymongo: PaymongoService,
    private readonly stripe: StripeService
  ) {}

  @Post("initiate")
  @UseGuards(JwtAuthGuard)
  initiate(@Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(dto.rideId, dto.provider);
  }

  // These two need the RAW request body for signature verification —
  // wire `express.raw()` for these exact routes in main.ts / a middleware,
  // ahead of the global JSON body parser.
  @Post("webhooks/paymongo")
  async paymongoWebhook(@Req() req: any, @Headers("paymongo-signature") sig: string) {
    const { providerRef, status } = this.paymongo.verifyWebhookAndExtractStatus(req.rawBody, sig);
    await this.paymentsService.markPaidByProviderRef(providerRef, status);
    return { received: true };
  }

  @Post("webhooks/stripe")
  async stripeWebhook(@Req() req: any, @Headers("stripe-signature") sig: string) {
    const { providerRef, status } = this.stripe.verifyWebhookAndExtractStatus(req.rawBody, sig);
    await this.paymentsService.markPaidByProviderRef(providerRef, status);
    return { received: true };
  }
}
