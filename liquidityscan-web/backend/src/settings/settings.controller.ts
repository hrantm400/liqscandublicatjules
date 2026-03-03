import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { DataProvider } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    async getSettings() {
        return this.settingsService.getSettings();
    }

    @Put('provider')
    async updateProvider(@Body('provider') provider: DataProvider) {
        if (!Object.values(DataProvider).includes(provider)) {
            throw new Error('Invalid Data Provider');
        }
        return this.settingsService.updateActiveProvider(provider);
    }
}
