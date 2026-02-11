import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  @Put('me')
  async updateProfile(@Req() req: any, @Body() data: { name?: string; avatar?: string }) {
    return this.usersService.updateProfile(req.user.userId, data);
  }
}
