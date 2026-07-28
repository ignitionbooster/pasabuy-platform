import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { PaymentProviderClient, CreatePaymentResult } from "./payment-provider.interface";

// NOTE: GCash does not expose a simple public merchant API on its own —
// in the Philippines you integrate GCash as an e-wallet "source" through a
// licensed aggregator. PayMongo is the standard choice, so GCash payments
// below are really PayMongo Sources with type=gcash under the hood.
@Injectable()
export class PaymongoService implements PaymentProviderClient {
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.paymongo.com/v1";

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>("PAYMONGO_SECRET_KEY") ?? "";
  }

  private authHeader() {
    return "Basic " + Buffer.from(`${this.secretKey}:`).toString("base64");
  }

  async createPayment(params: { amount: number; currency: string; rideId: string; description: string }): Promise<CreatePaymentResult> {
    // Amount in centavos, per PayMongo's API convention.
    const res = await fetch(`${this.baseUrl}/sources`, {
      method: "POST",
      headers: { Authorization: this.authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(params.amount * 100),
            currency: params.currency,
            type: "gcash",
            redirect: {
              success: `${process.env.APP_URL}/payments/callback?ride=${params.rideId}&status=success`,
              failed: `${process.env.APP_URL}/payments/callback?ride=${params.rideId}&status=failed`,
            },
          },
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.errors?.[0]?.detail ?? "PayMongo source creation failed");

    return {
      providerRef: json.data.id,
      redirectUrl: json.data.attributes.redirect.checkout_url,
      status: "PENDING",
    };
  }

  /** PayMongo signs webhooks as `t=...,te=...,li=...` in the Paymongo-Signature header. */
  verifyWebhookAndExtractStatus(rawBody: Buffer, signatureHeader: string) {
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET ?? "";
    const parts = Object.fromEntries(signatureHeader.split(",").map((p) => p.split("=")));
    const signedPayload = `${parts.t}.${rawBody.toString()}`;
    const expected = crypto.createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
    const liveSig = parts.li ?? parts.te;
    if (expected !== liveSig) throw new Error("Invalid PayMongo webhook signature");

    const event = JSON.parse(rawBody.toString());
    const type = event.data.attributes.type as string;
    const resource = event.data.attributes.data;
    const status = type.endsWith("paid") ? "PAID" : "FAILED";
    return { providerRef: resource.id as string, status: status as "PAID" | "FAILED" };
  }
}
