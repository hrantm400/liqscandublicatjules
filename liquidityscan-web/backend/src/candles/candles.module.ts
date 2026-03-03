import { Module } from '@nestjs/common';
import { CandlesController } from './candles.controller';
import { CandlesService } from './candles.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CandlesController],
  providers: [CandlesService],
  exports: [CandlesService],
})
export class CandlesModule { }
