import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";

export const FIREBASE_ADMIN = "FIREBASE_ADMIN";

export const FirebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    if (admin.apps.length) return admin.app();
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.get<string>("FIREBASE_PROJECT_ID"),
        clientEmail: config.get<string>("FIREBASE_CLIENT_EMAIL"),
        // .env stores the key with literal \n — swap them back to real newlines
        privateKey: config.get<string>("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n"),
      }),
    });
  },
};
