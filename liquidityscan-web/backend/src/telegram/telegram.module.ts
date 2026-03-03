import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { PrismaModule } from '../prisma/prisma.module'; // Import Prisma to check for subscribers
import { CandlesModule } from '../candles/candles.module';

@Module({
    imports: [PrismaModule, CandlesModule],
    providers: [TelegramService],
    exports: [TelegramService],
})
export class TelegramModule { }
