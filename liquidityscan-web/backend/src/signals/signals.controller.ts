import { Controller, Get, Post, Body, Headers, UnauthorizedException, Query, Param, NotFoundException, Logger } from '@nestjs/common';
import { SignalsService } from './signals.service';
import { ScannerService } from './scanner.service';

const WEBHOOK_SECRET_HEADER = 'x-webhook-secret';

@Controller('signals')
export class SignalsController {
  private readonly logger = new Logger(SignalsController.name);

  constructor(
    private readonly signalsService: SignalsService,
    private readonly scannerService: ScannerService,
  ) { }

  @Post('scan')
  async runScan() {
    this.logger.log('Manual scan triggered via POST /signals/scan');
    // Run scan in background or await it? Awaiting is better for response
    await this.scannerService.scanBasicStrategies();
    return { status: 'Scan completed' };
  }

  @Get('live-bias')
  async getLiveBias(@Query('timeframe') timeframe?: string) {
    const tf = timeframe || '4h';
    return this.scannerService.getLiveBias(tf);
  }

  @Get('stats')
  async getStats(@Query('strategyType') strategyType?: string) {
    return this.signalsService.getSignalStats(strategyType || undefined);
  }

  @Get(':id')
  async getSignalById(@Param('id') id: string) {
    const signal = await this.signalsService.getSignalById(id);
    if (!signal) {
      throw new NotFoundException(`Signal ${id} not found`);
    }
    return signal;
  }

  @Post('webhook')
  async webhook(
    @Headers(WEBHOOK_SECRET_HEADER) secret: string | undefined,
    @Body() body: unknown,
  ): Promise<{ received: number }> {
    this.logger.log('Webhook POST /signals/webhook — request received');
    const expected = (process.env.SIGNALS_WEBHOOK_SECRET ?? '').trim();
    const secretTrimmed = (secret ?? '').trim();
    if (!expected || secretTrimmed !== expected) {
      this.logger.warn('Webhook rejected: invalid or missing x-webhook-secret');
      throw new UnauthorizedException('Invalid or missing webhook secret');
    }
    this.logger.log('Webhook authenticated (secret OK)');
    const b = body as Record<string, unknown> | null;
    const bodyKeys = b && typeof b === 'object' ? Object.keys(b).join(',') : 'not-object';
    this.logger.log(`Webhook body keys: ${bodyKeys}`);
    const hasCoin = b?.coin != null && typeof b.coin === 'object';
    const hasByTf = b?.signals_by_timeframe != null || (b as any)?.signalsByTimeframe != null;
    const coinsInPayload = Array.isArray(b?.signals) ? b.signals.length : (hasCoin || (b?.symbol && hasByTf) ? 1 : 0);
    const arr = this.signalsService.normalizeWebhookBody(body);
    const received = await this.signalsService.addSignals(arr);
    this.logger.log(
      `Webhook result: payload coins=${coinsInPayload}, parsed (4h/1d/1w)=${arr.length}, accepted=${received}`,
    );
    return { received };
  }

  @Get()
  getSignals(@Query('strategyType') strategyType?: string) {
    return this.signalsService.getSignals(strategyType || undefined).then((list) => {
      // this.logger.log(`GET /signals strategyType=${strategyType ?? 'all'} -> ${list.length} signals`);
      return list;
    });
  }
}
