import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
    constructor(private readonly alertsService: AlertsService) { }

    @Get()
    async getMyAlerts(@Req() req) {
        return this.alertsService.getUserAlerts(req.user.userId);
    }

    @Post()
    async createAlert(@Req() req, @Body() body: { symbol: string; strategyType: string }) {
        return this.alertsService.createAlert(req.user.userId, body.symbol, body.strategyType);
    }

    @Delete(':id')
    async deleteAlert(@Req() req, @Param('id') id: string) {
        return this.alertsService.deleteAlert(req.user.userId, id);
    }

    @Post('telegram-id')
    async saveTelegramId(@Req() req, @Body() body: { telegramId: string }) {
        return this.alertsService.saveTelegramId(req.user.userId, body.telegramId);
    }

    @Get('telegram-id')
    async getTelegramId(@Req() req) {
        return this.alertsService.getTelegramId(req.user.userId);
    }
}
