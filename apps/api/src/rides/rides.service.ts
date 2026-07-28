import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RequestRideDto } from "../common/dto/ride.dto";

// Same fare model as the original prototype — base + per-km, per vehicle class.
const FARE_RATES: Record<string, { base: number; perKm: number }> = {
  BIKE: { base: 35, perKm: 8 },
  CAR: { base: 45, perKm: 12 },
  PLUS: { base: 55, perKm: 14 },
  XL: { base: 70, perKm: 16 },
};

@Injectable()
export class RidesService {
  constructor(private readonly prisma: PrismaService) {}

  computeFare(vehicleType: string, distanceKm: number) {
    const rate = FARE_RATES[vehicleType];
    if (!rate) throw new BadRequestException("Unknown vehicle type");
    return Math.round(rate.base + rate.perKm * distanceKm);
  }

  async requestRide(riderId: string, dto: RequestRideDto) {
    const fareAmount = this.computeFare(dto.vehicleType, dto.distanceKm);

    const ride = await this.prisma.$queryRaw`
      INSERT INTO "Ride" (
        id, "riderId", status, "vehicleType",
        "pickupLabel", "pickupLocation",
        "dropoffLabel", "dropoffLocation",
        "distanceKm", "durationMin", "fareAmount", "currency", "requestedAt"
      ) VALUES (
        gen_random_uuid(), ${riderId}, 'MATCHING', ${dto.vehicleType}::"VehicleType",
        ${dto.pickupLabel}, ST_SetSRID(ST_MakePoint(${dto.pickupLng}, ${dto.pickupLat}), 4326)::geography,
        ${dto.dropoffLabel}, ST_SetSRID(ST_MakePoint(${dto.dropoffLng}, ${dto.dropoffLat}), 4326)::geography,
        ${dto.distanceKm}, ${dto.durationMin}, ${fareAmount}, 'PHP', now()
      )
      RETURNING id, status, "fareAmount";
    `;
    return Array.isArray(ride) ? ride[0] : ride;
  }

  async findNearbyDrivers(lat: number, lng: number, vehicleType?: string) {
    return this.prisma.findNearbyDrivers(lat, lng, 5000, vehicleType);
  }

  async assignDriver(rideId: string, driverId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException("Ride not found");
    if (ride.status !== "MATCHING") throw new BadRequestException("Ride already matched");

    return this.prisma.ride.update({
      where: { id: rideId },
      data: { driverId, status: "ACCEPTED", acceptedAt: new Date() },
    });
  }

  async updateStatus(rideId: string, status: "DRIVER_EN_ROUTE" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") {
    const timestampField =
      status === "IN_PROGRESS" ? { startedAt: new Date() } :
      status === "COMPLETED" ? { completedAt: new Date() } :
      status === "CANCELLED" ? { cancelledAt: new Date() } : {};

    const ride = await this.prisma.ride.update({
      where: { id: rideId },
      data: { status, ...timestampField },
    });

    if (status === "COMPLETED" && ride.driverId) {
      await this.prisma.driverProfile.update({
        where: { id: ride.driverId },
        data: { totalTrips: { increment: 1 } },
      });
    }
    return ride;
  }

  async rateRide(rideId: string, rating: number, tipAmount = 0) {
    const ride = await this.prisma.ride.update({
      where: { id: rideId },
      data: { ratingByRider: rating, tipAmount },
    });
    if (ride.driverId) {
      const driver = await this.prisma.driverProfile.findUnique({ where: { id: ride.driverId } });
      if (driver) {
        const newRating = (driver.rating * driver.totalTrips + rating) / (driver.totalTrips + 1);
        await this.prisma.driverProfile.update({ where: { id: driver.id }, data: { rating: newRating } });
      }
    }
    return ride;
  }

  async updateDriverLocation(driverProfileId: string, lat: number, lng: number) {
    await this.prisma.$executeRaw`
      UPDATE "DriverProfile"
      SET "currentLocation" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          "lastLocationAt" = now()
      WHERE id = ${driverProfileId};
    `;
  }

  getRide(rideId: string) {
    return this.prisma.ride.findUnique({ where: { id: rideId }, include: { payment: true } });
  }
}
