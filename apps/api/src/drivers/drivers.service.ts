import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  setOnline(userId: string, isOnline: boolean) {
    return this.prisma.driverProfile.update({
      where: { userId },
      data: { isOnline },
    });
  }

  getEarningsSummary(driverProfileId: string) {
    return this.prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
      select: { totalTrips: true, rating: true },
    });
  }
}
