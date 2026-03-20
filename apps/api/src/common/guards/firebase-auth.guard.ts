import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseService } from '../firebase/firebase.service';
import { DatabaseService } from '../database/database.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly db: DatabaseService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = await this.firebase.verifyIdToken(token);

      // Resolve internal user from firebase_uid
      const { rows } = await this.db.query<{
        id: string;
        role: string;
        status: string;
      }>(
        'SELECT id, role, status FROM auth.users WHERE firebase_uid = $1',
        [decoded.uid],
      );

      if (rows.length === 0) {
        throw new UnauthorizedException('User not registered');
      }

      const user = rows[0];
      if (user.status === 'SUSPENDED') {
        throw new UnauthorizedException('Account suspended');
      }

      request.user = {
        id: user.id,
        firebaseUid: decoded.uid,
        role: user.role,
        phone: decoded.phone_number,
        email: decoded.email,
      };

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
