import { Controller, Get, Post, Put, Param, Body, UseGuards, Req, Headers, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { startPaymentSession } from '../lib/payments/start-payment-session';
import { activeSessions } from '../lib/payments/generate-unique-amount';
import { Network, PlanType } from '../lib/payments/types';
import { PrismaService } from '../prisma/prisma.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private prisma: PrismaService
  ) { }

  @Post('nowpayments-webhook')
  @HttpCode(HttpStatus.OK)
  async nowPaymentsWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-nowpayments-sig') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing x-nowpayments-sig');
    }
    try {
      await this.paymentsService.handleNowPaymentsWebhook(body, signature);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Webhook processing failed');
    }
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Body() data: { amount: number; currency?: string; subscriptionId?: string; metadata?: any },
    @Req() req: any,
  ) {
    return this.paymentsService.createPayment(
      req.user.userId,
      data.amount,
      data.currency || 'USD',
      data.subscriptionId,
      data.metadata,
    );
  }

  @Get('status/:id')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(@Param('id') id: string) {
    return this.paymentsService.getPaymentStatus(id);
  }

  @Post('start')
  @UseGuards(JwtAuthGuard)
  async startCustomPaymentSession(
    @Body() data: { user_id?: string; network: Network; plan_type: PlanType },
    @Req() req: any,
  ) {
    const userId = data.user_id || req.user.userId;
    try {
      const result = await startPaymentSession(userId, data.network, data.plan_type, this.prisma);
      return result;
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Failed to start payment session');
    }
  }

  @Get('session-status')
  @UseGuards(JwtAuthGuard)
  async getCustomSessionStatus(@Req() req: any) {
    const userId = req.user.userId;
    for (const session of activeSessions.values()) {
      if (session.user_id === userId) {
        return {
          status: 'pending',
          session,
        };
      }
    }
    return { status: 'not_found_or_completed' };
  }

  @Put('status/:id')
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() data: { status: string; paymentId?: string },
  ) {
    return this.paymentsService.updatePaymentStatus(id, data.status, data.paymentId);
  }

  @Get('my-payments')
  @UseGuards(JwtAuthGuard)
  async getMyPayments(@Req() req: any) {
    return this.paymentsService.getUserPayments(req.user.userId);
  }

  @Post('subscription/:subscriptionId')
  @UseGuards(JwtAuthGuard)
  async createSubscriptionPayment(
    @Param('subscriptionId') subscriptionId: string,
    @Req() req: any,
  ) {
    return this.paymentsService.createSubscriptionPayment(req.user.userId, subscriptionId);
  }

  @Post('process-subscription/:paymentId')
  async processSubscriptionPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.processSubscriptionPayment(paymentId);
  }
}
