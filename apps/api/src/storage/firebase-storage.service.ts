import { Inject, Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FIREBASE_ADMIN } from "../auth/firebase-admin.provider";

// Used for small, frequently-accessed assets tied to auth (avatars, driver
// verification docs) that benefit from being in the same project as Auth.
// Larger/bulkier media (trip photos, exports) goes to R2Service instead —
// R2 has zero egress fees, which matters once trip volume grows.
@Injectable()
export class FirebaseStorageService {
  constructor(@Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App) {}

  async uploadAvatar(userId: string, buffer: Buffer, contentType: string) {
    const bucket = this.firebaseApp.storage().bucket();
    const file = bucket.file(`avatars/${userId}.jpg`);
    await file.save(buffer, { contentType, public: true });
    return file.publicUrl();
  }
}
