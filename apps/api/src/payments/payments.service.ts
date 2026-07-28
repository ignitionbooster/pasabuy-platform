import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PaymongoService } from "./paymongo.service";
import { StripeService } from "./stripe.service";

export type PaymentProviderName = "CASH" | "GCASH" | "PAYMONGO" | "STRIPE";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymongo: PaymongoService,
    private readonly stripe: StripeService
  ) {}

  async initiatePayment(rideId: string, provider: PaymentProviderName) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride || !ride.fareAmount) throw new BadRequestException("Ride has no fare to charge");
    const amount = Number(ride.fareAmount) + Number(ride.tipAmount ?? 0);

    if (provider === "CASH") {
      const payment = await this.prisma.payment.create({
        data: { rideId, provider: "CASH", status: "PAID", amount, paidAt: new Date() },
      });
      return { payment };
    }

    const client = provider === "STRIPE" ? this.stripe : this.paymongo; // GCASH routes through PayMongo
    const result = await client.createPayment({
      amount, currency: ride.currency, rideId,
      description: `Sakay ride ${ride.id}`,
    });

    const payment = await this.prisma.payment.create({
      data: {
        rideId,
        provider: provider === "GCASH" ? "GCASH" : provider === "STRIPE" ? "STRIPE" : "PAYMONGO",
        status: "PENDING",
        amount,
        providerRef: result.providerRef,
      },
    });

    return { payment, redirectUrl: result.redirectUrl, clientSecret: result.clientSecret };
  }

  async markPaidByProviderRef(providerRef: string, status: "PAID" | "FAILED") {
    return this.prisma.payment.updateMany({
      where: { providerRef },
      data: { status, paidAt: status === "PAID" ? new Date() : undefined },
    });
  }
}
