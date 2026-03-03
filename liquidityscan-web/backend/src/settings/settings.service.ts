import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataProvider } from '@prisma/client';

@Injectable()
export class SettingsService {
    private readonly logger = new Logger(SettingsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getSettings() {
        let settings = await this.prisma.settings.findUnique({ where: { id: 'singleton' } });
        if (!settings) {
            settings = await this.prisma.settings.create({
                data: { id: 'singleton', activeProvider: DataProvider.COINRAY }
            });
        }
        return settings;
    }

    async updateActiveProvider(provider: DataProvider) {
        this.logger.log(`Admin changed Active API Provider to: ${provider}`);
        const settings = await this.prisma.settings.upsert({
            where: { id: 'singleton' },
            update: { activeProvider: provider },
            create: { id: 'singleton', activeProvider: provider },
        });
        return settings;
    }
}
