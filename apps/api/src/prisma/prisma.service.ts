import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Raw PostGIS helper: nearby online drivers within `radiusMeters` of a point,
   * ordered by distance. Prisma can't express ST_DWithin natively, hence $queryRaw.
   */
  async findNearbyDrivers(lat: number, lng: number, radiusMeters = 5000, vehicleType?: string) {
    return this.$queryRaw`
      SELECT id, "userId", "vehicleType", rating,
             ST_Y("currentLocation"::geometry) AS lat,
             ST_X("currentLocation"::geometry) AS lng,
             ST_Distance("currentLocation", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance_m
      FROM "DriverProfile"
      WHERE "isOnline" = true
        AND ${vehicleType ? this.$queryRaw`"vehicleType" = ${vehicleType}::"VehicleType"` : this.$queryRaw`true`}
        AND ST_DWithin("currentLocation", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
      ORDER BY distance_m ASC
      LIMIT 10;
    `;
  }
}
