import { Module } from '@nestjs/common';
import { SignalsController } from './signals.controller';
import { SignalsService } from './signals.service';
import { ScannerService } from './scanner.service';
import { LifecycleService } from './lifecycle.service';
import { PositionTrackerService } from './position-tracker.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CandlesModule } from '../candles/candles.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [PrismaModule, CandlesModule, TelegramModule],
  controllers: [SignalsController],
  providers: [SignalsService, ScannerService, LifecycleService, PositionTrackerService],
  exports: [SignalsService],
})
export class SignalsModule { }
