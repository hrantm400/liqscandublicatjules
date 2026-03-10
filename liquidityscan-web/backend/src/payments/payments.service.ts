import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

const NOWPAYMENTS_API_BASE = 'https://api.nowpayments.io/v1';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(private prisma: PrismaService) { }

  async createPayment(userId: string, baseAmount: number, currency: string = 'USDT', subscriptionId?: string, metadata?: any) {
    // Determine unique fractional amount
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 15); // Check last 15 mins to be safe

    const recentPendingPayments = await this.prisma.payment.findMany({
      where: {
        status: 'pending',
        createdAt: { gte: tenMinutesAgo },
      },
    });

    let uniqueAmount = baseAmount;
    let increment = 0;
    const maxIncrement = 99; // Allows up to .99

    while (increment <= maxIncrement) {
      const testAmount = parseFloat((baseAmount + increment / 100).toFixed(2));
      const isTaken = recentPendingPayments.some(p => parseFloat(p.amount.toString()) === testAmount);

      if (!isTaken) {
        uniqueAmount = testAmount;
        break;
      }
      increment++;
    }

    if (increment > maxIncrement) {
      throw new BadRequestException('Too many concurrent checkout sessions. Please try again in a few minutes.');
    }

    // Set expiration 10 mins from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const paymentInfoMeta = {
      ...(metadata || {}),
      walletAddress: process.env.TRC20_WALLET_ADDRESS || 'TMkU...', // Provide a fallback or error
      expiresAt: expiresAt.toISOString(),
    };

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: uniqueAmount,
        currency,
        status: 'pending',
        paymentMethod: 'crypto_trc20',
        subscriptionId: subscriptionId || null,
        metadata: paymentInfoMeta,
      },
    });

    // Provide the frontend with the required info
    return {
      ...payment,
      paymentId: payment.id, // We use our own DB ID now
      paymentUrl: '', // No external URL anymore
    };
  }

  async createSubscriptionPayment(userId: string, subscriptionId: string, plan: 'monthly' | 'annual' = 'monthly') {
    // Get subscription details
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
    }

    const amount = plan === 'annual' && subscription.priceYearly
      ? parseFloat(subscription.priceYearly.toString())
      : parseFloat(subscription.priceMonthly.toString());

    // Create payment for subscription
    return this.createPayment(userId, amount, 'USD', subscriptionId, { plan });
  }

  async processSubscriptionPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'pending') {
      throw new BadRequestException(`Payment is already ${payment.status}`);
    }

    if (!payment.subscriptionId) {
      throw new BadRequestException('This payment is not for a subscription');
    }

    // Get subscription
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: payment.subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Determine plan type from payment metadata or amount
    const meta = (payment.metadata as any) || {};
    const payAmount = Number(payment.amount);

    // Check if it's an annual plan from metadata or price
    const isAnnual = meta.plan === 'annual' || payAmount >= 400;

    // Use subscription duration if available, otherwise fallback
    let durationDays = subscription.duration || 30;
    if (isAnnual && subscription.priceYearly) {
      durationDays = 365;
    }

    const tier = isAnnual ? 'PAID_ANNUAL' : 'PAID_MONTHLY';

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Update payment status
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'completed' },
    });

    // Assign subscription + upgrade tier
    await this.prisma.user.update({
      where: { id: payment.userId },
      data: {
        subscriptionId: subscription.id,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
        tier,
      },
    });

    // Create UserSubscription record
    await this.prisma.userSubscription.create({
      data: {
        userId: payment.userId,
        subscriptionId: subscription.id,
        startDate: new Date(),
        endDate: expiresAt,
        status: 'active',
        paymentId: paymentId,
      },
    });

    // Credit affiliate commission if user was referred
    try {
      const referral = await this.prisma.affiliateReferral.findUnique({
        where: { referredUserId: payment.userId },
        include: { affiliate: true },
      });
      if (referral && referral.affiliate) {
        const RATES: Record<string, number> = { STANDARD: 0.30, ELITE: 0.40, AGENCY: 0.20 };
        const rate = RATES[referral.affiliate.tier] || 0.30;
        const commission = payAmount * rate;
        await this.prisma.affiliateReferral.update({
          where: { id: referral.id },
          data: { paymentAmount: payAmount, commission, status: 'CONVERTED' },
        });
        await this.prisma.affiliate.update({
          where: { id: referral.affiliateId },
          data: { totalSales: { increment: 1 }, totalEarned: { increment: commission } },
        });
        this.logger.log(`Affiliate commission: $${commission.toFixed(2)} to ${referral.affiliate.code}`);
      }
    } catch (e) {
      this.logger.error(`Affiliate commission error: ${e}`);
    }

    this.logger.log(`User ${payment.userId} upgraded to ${tier}, expires ${expiresAt.toISOString()}`);

    return {
      success: true,
      subscription,
      tier,
      expiresAt,
    };
  }

  async getPaymentStatus(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async updatePaymentStatus(paymentId: string, status: string, paymentIdExternal?: string) {
    const data: { status: string; paymentId?: string } = { status };
    if (paymentIdExternal !== undefined && paymentIdExternal !== null) {
      data.paymentId = paymentIdExternal;
    }
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data,
    });
    return payment;
  }

  /** Verify NOWPayments IPN signature (HMAC-SHA512 of sorted JSON body). */
  verifyNowPaymentsIpnSignature(body: Record<string, unknown>, signature: string): boolean {
    const secret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (!secret || !signature) return false;
    try {
      const keys = Object.keys(body).sort();
      const sorted: Record<string, unknown> = {};
      for (const k of keys) sorted[k] = body[k];
      const payload = JSON.stringify(sorted);
      const expected = crypto.createHmac('sha512', secret).update(payload).digest('hex');
      const sigBuf = Buffer.from(signature, 'hex');
      const expBuf = Buffer.from(expected, 'hex');
      return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  /** Handle IPN webhook from NOWPayments: verify signature, update payment, process subscription if paid. */
  async handleNowPaymentsWebhook(body: Record<string, unknown>, signature: string): Promise<void> {
    if (!this.verifyNowPaymentsIpnSignature(body, signature)) {
      throw new BadRequestException('Invalid IPN signature');
    }
    const orderId = body.order_id as string | undefined;
    const status = String(body.payment_status ?? body.status ?? '').toLowerCase();
    if (!orderId) return;

    if (status === 'finished' || status === 'paid' || status === 'confirmed') {
      try {
        await this.processSubscriptionPayment(orderId);
      } catch (e) {
        if (e instanceof BadRequestException && e.getResponse()?.toString().includes('already')) {
          return;
        }
        throw e;
      }
    } else if (status === 'failed' || status === 'expired' || status === 'refunded') {
      await this.prisma.payment.updateMany({
        where: { id: orderId, status: 'pending' },
        data: { status: 'failed' },
      });
    }
  }

  async getUserPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
