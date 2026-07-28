import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { RidesController } from "./rides.controller";
import { RidesService } from "./rides.service";
import { RidesGateway } from "./rides.gateway";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule, JwtModule],
  controllers: [RidesController],
  providers: [RidesService, RidesGateway],
  exports: [RidesService],
})
export class RidesModule {}
