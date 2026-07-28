import { IsEnum, IsLatitude, IsLongitude, IsNumber, IsString, Min } from "class-validator";

export enum VehicleTypeDto {
  BIKE = "BIKE",
  CAR = "CAR",
  PLUS = "PLUS",
  XL = "XL",
}

export class RequestRideDto {
  @IsString() pickupLabel!: string;
  @IsLatitude() pickupLat!: number;
  @IsLongitude() pickupLng!: number;

  @IsString() dropoffLabel!: string;
  @IsLatitude() dropoffLat!: number;
  @IsLongitude() dropoffLng!: number;

  @IsEnum(VehicleTypeDto) vehicleType!: VehicleTypeDto;

  @IsNumber() @Min(0) distanceKm!: number;
  @IsNumber() @Min(0) durationMin!: number;
}

export class UpdateDriverLocationDto {
  @IsLatitude() lat!: number;
  @IsLongitude() lng!: number;
}

export class RateRideDto {
  @IsNumber() @Min(1) rating!: number;
  @IsNumber() @Min(0) tipAmount?: number;
}
