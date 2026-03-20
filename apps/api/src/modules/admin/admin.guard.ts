import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminServiceKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const key = request.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_SERVICE_KEY;
    if (!expectedKey || key !== expectedKey) {
      throw new UnauthorizedException('Invalid admin key');
    }
    return true;
  }
}
