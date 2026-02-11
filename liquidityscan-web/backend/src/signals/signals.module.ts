import { Module } from '@nestjs/common';
import { SignalsController } from './signals.controller';
import { SignalsService } from './signals.service';
import { ScannerService } from './scanner.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CandlesModule } from '../candles/candles.module';

@Module({
  imports: [PrismaModule, CandlesModule],
  controllers: [SignalsController],
  providers: [SignalsService, ScannerService],
  exports: [SignalsService],
})
export class SignalsModule { }
