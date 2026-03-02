import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
    constructor(private readonly alertsService: AlertsService) { }

    @Get()
    async getMyAlerts(@Req() req) {
        return this.alertsService.getUserAlerts(req.user.id);
    }

    @Post()
    async createAlert(@Req() req, @Body() body: { symbol: string; strategyType: string }) {
        return this.alertsService.createAlert(req.user.id, body.symbol, body.strategyType);
    }

    @Delete(':id')
    async deleteAlert(@Req() req, @Param('id') id: string) {
        return this.alertsService.deleteAlert(req.user.id, id);
    }

    @Post('telegram-id')
    async saveTelegramId(@Req() req, @Body() body: { telegramId: string }) {
        return this.alertsService.saveTelegramId(req.user.id, body.telegramId);
    }

    @Get('telegram-id')
    async getTelegramId(@Req() req) {
        return this.alertsService.getTelegramId(req.user.id);
    }
}
