import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { FirebaseAdminProvider } from "../auth/firebase-admin.provider";

@Module({
  providers: [NotificationsService, FirebaseAdminProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
