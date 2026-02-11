import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private isAdminEmail(email: string): boolean {
    const adminEmails = this.configService.get<string>('ADMIN_EMAILS', '');
    if (!adminEmails) return false;
    
    const emailList = adminEmails.split(',').map(e => e.trim().toLowerCase());
    return emailList.includes(email.toLowerCase());
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('[AdminGuard] Checking access, user from JWT:', user);

    if (!user) {
      console.error('[AdminGuard] User not authenticated - no user in request');
      throw new ForbiddenException('User not authenticated');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { 
        isAdmin: true,
        email: true,
      },
    });

    console.log('[AdminGuard] DB user:', dbUser);

    if (!dbUser) {
      console.error('[AdminGuard] User not found in database:', user.userId);
      throw new ForbiddenException('User not found');
    }

    // Check both: isAdmin flag in DB and email in ADMIN_EMAILS list
    const isEmailInAdminList = this.isAdminEmail(dbUser.email);
    const adminEmails = this.configService.get<string>('ADMIN_EMAILS', '');
    
    console.log('[AdminGuard] Admin check:', {
      email: dbUser.email,
      isAdmin: dbUser.isAdmin,
      isEmailInAdminList,
      adminEmailsList: adminEmails,
    });
    
    if (!dbUser.isAdmin || !isEmailInAdminList) {
      console.error('[AdminGuard] Access denied:', {
        isAdmin: dbUser.isAdmin,
        isEmailInAdminList,
        email: dbUser.email,
      });
      throw new ForbiddenException(`Admin access required. Your email (${dbUser.email}) must be in ADMIN_EMAILS list and isAdmin must be true.`);
    }

    console.log('[AdminGuard] Access granted');
    return true;
  }
}
