import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

// Функция для создания условных провайдеров
function getAuthProviders(): any[] {
  const baseProviders: any[] = [AuthService, JwtStrategy];
  
  // Проверяем наличие Google OAuth credentials через переменные окружения
  // Это делается на этапе загрузки модуля, поэтому используем process.env напрямую
  const hasGoogleCredentials = 
    process.env.GOOGLE_CLIENT_ID && 
    process.env.GOOGLE_CLIENT_SECRET;
  
  if (hasGoogleCredentials) {
    baseProviders.push(GoogleStrategy);
  } else {
    console.log('⚠️  Google OAuth credentials not found. Google login will be disabled.');
    console.log('   To enable Google OAuth, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
  }
  
  return baseProviders;
}

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: getAuthProviders(),
  exports: [AuthService],
})
export class AuthModule {}
