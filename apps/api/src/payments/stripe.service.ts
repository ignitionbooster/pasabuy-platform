import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PaymentProviderClient, CreatePaymentResult } from "./payment-provider.interface";

@Injectable()
export class StripeService implements PaymentProviderClient {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    this.stripe = new Stripe(config.get<string>("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2024-06-20",
    });
    this.webhookSecret = config.get<string>("STRIPE_WEBHOOK_SECRET") ?? "";
  }

  async createPayment(params: { amount: number; currency: string; rideId: string; description: string }): Promise<CreatePaymentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100),
      currency: params.currency.toLowerCase(),
      description: params.description,
      metadata: { rideId: params.rideId },
      automatic_payment_methods: { enabled: true },
    });
    return { providerRef: intent.id, clientSecret: intent.client_secret ?? undefined, status: "PENDING" };
  }

  verifyWebhookAndExtractStatus(rawBody: Buffer, signatureHeader: string) {
    const event = this.stripe.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);
    const status = event.type === "payment_intent.succeeded" ? "PAID" : "FAILED";
    const intent = event.data.object as Stripe.PaymentIntent;
    return { providerRef: intent.id, status: status as "PAID" | "FAILED" };
  }
}
