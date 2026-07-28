export interface CreatePaymentResult {
  providerRef: string;
  redirectUrl?: string; // for redirect-based flows like GCash/PayMongo sources
  clientSecret?: string; // for Stripe PaymentIntent confirmation on-device
  status: "PENDING" | "PAID" | "FAILED";
}

export interface PaymentProviderClient {
  createPayment(params: { amount: number; currency: string; rideId: string; description: string }): Promise<CreatePaymentResult>;
  verifyWebhookAndExtractStatus(rawBody: Buffer, signatureHeader: string): { providerRef: string; status: "PAID" | "FAILED" };
}
