import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private isAdminEmail(email: string): boolean {
    const adminEmails = this.configService.get<string>('ADMIN_EMAILS', '');
    if (!adminEmails) return false;
    
    const emailList = adminEmails.split(',').map(e => e.trim().toLowerCase());
    return emailList.includes(email.toLowerCase());
  }

  async register(dto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Check if email is in admin list
    const isAdmin = this.isAdminEmail(dto.email);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        isAdmin,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Find user
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is in admin list and update isAdmin if needed
    const shouldBeAdmin = this.isAdminEmail(dto.email);
    if (shouldBeAdmin !== user.isAdmin) {
      // Update user's admin status
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: shouldBeAdmin },
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ...tokens,
    };
  }

  async googleLogin(profile: any) {
    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.id },
    });

    if (!user) {
      // Check if user exists by email
      const existingUser = await this.prisma.user.findUnique({
        where: { email: profile.emails[0].value },
      });

      if (existingUser) {
        // Check if email is in admin list and update if needed
        const isAdmin = this.isAdminEmail(profile.emails[0].value);
        
        // Link Google account and update admin status based on current ADMIN_EMAILS
        user = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { 
            googleId: profile.id,
            isAdmin: isAdmin, // Always use current ADMIN_EMAILS check, don't preserve old status
          },
        });
      } else {
        // Check if email is in admin list
        const isAdmin = this.isAdminEmail(profile.emails[0].value);
        
        // Create new user
        user = await this.prisma.user.create({
          data: {
            email: profile.emails[0].value,
            name: profile.displayName || profile.name?.givenName,
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value,
            isAdmin,
          },
        });
      }
    } else {
      // User exists with googleId - check and update isAdmin status based on current ADMIN_EMAILS
      const shouldBeAdmin = this.isAdminEmail(user.email);
      if (shouldBeAdmin !== user.isAdmin) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { isAdmin: shouldBeAdmin },
        });
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ...tokens,
    };
  }

  async validateUser(userId: string) {
    if (!userId) {
      return null;
    }
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return null;
    }

    // Check if email is in admin list and update isAdmin if needed
    const shouldBeAdmin = this.isAdminEmail(user.email);
    if (shouldBeAdmin !== user.isAdmin) {
      // Update user's admin status
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: shouldBeAdmin },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return updatedUser;
    }

    return user;
  }

  async refreshToken(refreshToken: string) {
    // Find refresh token
    const token = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!token || token.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(token.userId, token.user.email);

    // Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: token.id },
    });

    return tokens;
  }

  async fastLogin() {
    // Only allow in development mode
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv === 'production') {
      throw new UnauthorizedException('Fast login is only available in development mode');
    }

    // Find or create dev user
    const devEmail = 'dev@liquidityscan.local';
    const dbUser = await this.prisma.user.findUnique({
      where: { email: devEmail },
    });

    let user: {
      id: string;
      email: string;
      name: string | null;
      avatar: string | null;
      isAdmin: boolean;
      createdAt: Date;
      updatedAt: Date;
    };

    if (!dbUser) {
      // Check if email is in admin list
      const isAdmin = this.isAdminEmail(devEmail);
      
      // Create dev user
      const createdUser = await this.prisma.user.create({
        data: {
          email: devEmail,
          name: 'Dev User',
          password: await bcrypt.hash('dev-password', 10), // Set a password but not required for fast login
          isAdmin,
        },
      });
      
      user = {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        avatar: createdUser.avatar,
        isAdmin: createdUser.isAdmin,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
      };
    } else {
      // Update admin status if needed
      const shouldBeAdmin = this.isAdminEmail(devEmail);
      if (shouldBeAdmin !== dbUser.isAdmin) {
        const updatedUser = await this.prisma.user.update({
          where: { id: dbUser.id },
          data: { isAdmin: shouldBeAdmin },
        });
        
        user = {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatar: updatedUser.avatar,
          isAdmin: updatedUser.isAdmin,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        };
      } else {
        // Map to return format
        user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          avatar: dbUser.avatar,
          isAdmin: dbUser.isAdmin,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        };
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user,
      ...tokens,
    };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'refresh-secret',
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
    });

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
