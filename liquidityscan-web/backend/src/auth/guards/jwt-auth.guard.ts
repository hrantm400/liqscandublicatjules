import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    console.log('[JwtAuthGuard] Checking auth header:', authHeader ? 'Bearer token present' : 'No token');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) {
      console.error('[JwtAuthGuard] Error:', err);
      throw err;
    }
    if (!user) {
      console.error('[JwtAuthGuard] No user found, info:', info);
    } else {
      console.log('[JwtAuthGuard] User authenticated:', user);
    }
    return user;
  }
}
