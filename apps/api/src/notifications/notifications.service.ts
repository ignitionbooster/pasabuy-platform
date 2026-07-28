import { Inject, Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FIREBASE_ADMIN } from "../auth/firebase-admin.provider";

@Injectable()
export class NotificationsService {
  constructor(@Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App) {}

  async sendToDevice(deviceToken: string, title: string, body: string, data?: Record<string, string>) {
    return this.firebaseApp.messaging().send({
      token: deviceToken,
      notification: { title, body },
      data,
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    });
  }

  // Common ride lifecycle notifications, kept as named helpers so the
  // copy stays consistent wherever they're triggered from.
  notifyDriverMatched(deviceToken: string, driverName: string) {
    return this.sendToDevice(deviceToken, "Driver found!", `${driverName} is heading your way.`);
  }
  notifyDriverArrived(deviceToken: string) {
    return this.sendToDevice(deviceToken, "Your driver has arrived", "Head outside to meet them.");
  }
  notifyNewRideRequest(deviceToken: string, fare: number) {
    return this.sendToDevice(deviceToken, "New ride request", `₱${fare} · tap to view`);
  }
}
