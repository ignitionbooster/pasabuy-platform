import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody,
  ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { RidesService } from "./rides.service";

// Each ride gets its own Socket.IO room ("ride:<id>") so location/status
// updates only reach the rider + driver actually involved in that trip.
@WebSocketGateway({ namespace: "/realtime", cors: { origin: "*" } })
export class RidesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly ridesService: RidesService,
    private readonly jwt: JwtService
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("missing token");
      const payload = this.jwt.verify(token);
      (client as any).user = payload;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    // Optionally flip DriverProfile.isOnline -> false after a grace period here.
  }

  @SubscribeMessage("ride:join")
  onJoinRide(@ConnectedSocket() client: Socket, @MessageBody() data: { rideId: string }) {
    client.join(`ride:${data.rideId}`);
    return { joined: data.rideId };
  }

  @SubscribeMessage("driver:location")
  async onDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId?: string; driverProfileId: string; lat: number; lng: number }
  ) {
    await this.ridesService.updateDriverLocation(data.driverProfileId, data.lat, data.lng);
    if (data.rideId) {
      this.server.to(`ride:${data.rideId}`).emit("driver:location", {
        lat: data.lat, lng: data.lng, at: Date.now(),
      });
    }
  }

  @SubscribeMessage("ride:status")
  async onRideStatus(
    @MessageBody() data: { rideId: string; status: "DRIVER_EN_ROUTE" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }
  ) {
    const ride = await this.ridesService.updateStatus(data.rideId, data.status);
    this.server.to(`ride:${data.rideId}`).emit("ride:status", { status: ride.status, rideId: ride.id });
    return ride;
  }

  /** Called by RidesService/controller after a match is made server-side. */
  notifyMatched(rideId: string, driverPayload: unknown) {
    this.server.to(`ride:${rideId}`).emit("ride:matched", driverPayload);
  }
}
