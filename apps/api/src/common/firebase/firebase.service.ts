import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App;

  onModuleInit() {
    if (admin.apps.length === 0) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      this.app = admin.app();
    }
  }

  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return this.app.auth().verifyIdToken(token);
  }

  async createCustomToken(uid: string, claims?: Record<string, unknown>): Promise<string> {
    return this.app.auth().createCustomToken(uid, claims);
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    await this.app.auth().revokeRefreshTokens(uid);
  }

  async updateFirebaseUser(uid: string, updates: { email?: string; password?: string }): Promise<void> {
    const updateData: admin.auth.UpdateRequest = {};
    if (updates.email) updateData.email = updates.email;
    if (updates.password) updateData.password = updates.password;
    if (Object.keys(updateData).length > 0) {
      await this.app.auth().updateUser(uid, updateData);
    }
  }

  async getOrCreateUserByPhone(phone: string): Promise<{ uid: string; isNew: boolean }> {
    try {
      const user = await this.app.auth().getUserByPhoneNumber(phone);
      return { uid: user.uid, isNew: false };
    } catch {
      // User doesn't exist — create one
      const newUser = await this.app.auth().createUser({ phoneNumber: phone });
      return { uid: newUser.uid, isNew: true };
    }
  }

  async sendPushNotification(
    token: string,
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ): Promise<string> {
    return this.app.messaging().send({
      token,
      notification,
      data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  }

  async sendMulticastNotification(
    tokens: string[],
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ): Promise<admin.messaging.BatchResponse> {
    return this.app.messaging().sendEachForMulticast({
      tokens,
      notification,
      data,
    });
  }
}
