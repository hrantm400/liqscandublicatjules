import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
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
    async createAlert(
        @Req() req,
        @Body() body: {
            symbol: string;
            strategyType: string;
            timeframes?: string[];
            directions?: string[];
            minWinRate?: number;
        },
    ) {
        return this.alertsService.createAlert(
            req.user.userId,
            body.symbol,
            body.strategyType,
            body.timeframes,
            body.directions,
            body.minWinRate,
        );
    }

    @Put(':id')
    async updateAlert(
        @Req() req,
        @Param('id') id: string,
        @Body() body: {
            timeframes?: string[];
            directions?: string[];
            minWinRate?: number;
            isActive?: boolean;
        },
    ) {
        return this.alertsService.updateAlert(req.user.userId, id, body);
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
