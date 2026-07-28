import { Module } from "@nestjs/common";
import { R2Service } from "./r2.service";
import { FirebaseStorageService } from "./firebase-storage.service";
import { FirebaseAdminProvider } from "../auth/firebase-admin.provider";

@Module({
  providers: [R2Service, FirebaseStorageService, FirebaseAdminProvider],
  exports: [R2Service, FirebaseStorageService],
})
export class StorageModule {}
