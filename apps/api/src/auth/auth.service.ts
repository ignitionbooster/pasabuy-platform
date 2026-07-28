import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as admin from "firebase-admin";
import { PrismaService } from "../prisma/prisma.service";
import { FIREBASE_ADMIN } from "./firebase-admin.provider";

@Injectable()
export class AuthService {
  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  /**
   * Client sends the Firebase ID token it got from Firebase Auth (phone/OTP,
   * Google, etc). We verify it server-side, upsert the local User row, and
   * return our own short-lived JWT for subsequent REST/Socket.IO calls.
   */
  async loginWithFirebase(idToken: string) {
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await this.firebaseApp.auth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException("Invalid or expired Firebase ID token");
    }

    const user = await this.prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: {
        email: decoded.email ?? undefined,
        phone: decoded.phone_number ?? undefined,
      },
      create: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? null,
        phone: decoded.phone_number ?? null,
        displayName: decoded.name ?? null,
      },
    });

    const accessToken = this.jwt.sign({ sub: user.id, role: user.role });
    return { accessToken, user };
  }
}
