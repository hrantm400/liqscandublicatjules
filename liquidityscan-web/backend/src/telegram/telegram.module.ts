import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { PrismaModule } from '../prisma/prisma.module'; // Import Prisma to check for subscribers

@Module({
    imports: [PrismaModule],
    providers: [TelegramService],
    exports: [TelegramService],
})
export class TelegramModule { }
