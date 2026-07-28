import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import { RidesService } from "./rides.service";
import { RidesGateway } from "./rides.gateway";
import { RequestRideDto, RateRideDto } from "../common/dto/ride.dto";

@Controller("rides")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RidesController {
  constructor(
    private readonly ridesService: RidesService,
    private readonly gateway: RidesGateway
  ) {}

  @Post()
  @Roles("RIDER")
  request(@Req() req: any, @Body() dto: RequestRideDto) {
    return this.ridesService.requestRide(req.user.sub, dto);
  }

  @Post(":id/accept")
  @Roles("DRIVER")
  async accept(@Req() req: any, @Param("id") rideId: string) {
    const ride = await this.ridesService.assignDriver(rideId, req.user.sub);
    this.gateway.notifyMatched(rideId, { driverProfileId: req.user.sub });
    return ride;
  }

  @Post(":id/rate")
  @Roles("RIDER")
  rate(@Param("id") rideId: string, @Body() dto: RateRideDto) {
    return this.ridesService.rateRide(rideId, dto.rating, dto.tipAmount ?? 0);
  }

  @Get(":id")
  get(@Param("id") rideId: string) {
    return this.ridesService.getRide(rideId);
  }

  @Get("nearby-drivers/:lat/:lng")
  @Roles("RIDER")
  nearby(@Param("lat") lat: string, @Param("lng") lng: string) {
    return this.ridesService.findNearbyDrivers(parseFloat(lat), parseFloat(lng));
  }
}
