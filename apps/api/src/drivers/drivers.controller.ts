import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { IsBoolean } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import { DriversService } from "./drivers.service";

class SetOnlineDto {
  @IsBoolean() isOnline!: boolean;
}

@Controller("drivers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("DRIVER")
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post("online")
  setOnline(@Req() req: any, @Body() dto: SetOnlineDto) {
    return this.driversService.setOnline(req.user.sub, dto.isOnline);
  }

  @Get("earnings")
  earnings(@Req() req: any) {
    return this.driversService.getEarningsSummary(req.user.sub);
  }
}
