import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

const NOWPAYMENTS_API_BASE = 'https://api.nowpayments.io/v1';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPayment(userId: string, amount: number, currency: string = 'USD', subscriptionId?: string) {
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount,
        currency,
        status: 'pending',
        paymentMethod: 'crypto',
        subscriptionId: subscriptionId || null,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const paymentUrl = `${frontendUrl}/payment/${payment.id}`;

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (apiKey) {
      try {
        const body: Record<string, unknown> = {
          price_amount: amount,
          price_currency: currency.toLowerCase(),
          order_id: payment.id,
          order_description: subscriptionId ? 'Full Access - 30 days' : `Payment ${payment.id}`,
          success_url: `${frontendUrl}/payment/${payment.id}?status=success`,
          cancel_url: `${frontendUrl}/payment/${payment.id}?status=cancel`,
        };
        const ipnUrl = process.env.NOWPAYMENTS_IPN_CALLBACK_URL;
        if (ipnUrl) body.ipn_callback_url = ipnUrl;
        const res = await fetch(`${NOWPAYMENTS_API_BASE}/invoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`NOWPayments invoice failed: ${res.status} ${errText}`);
        }
        const invoice = (await res.json()) as { id?: number; invoice_id?: number; invoice_url?: string };
        const invoiceId = String(invoice.id ?? invoice.invoice_id ?? '');
        const invoiceUrl = invoice.invoice_url ?? '';
        if (invoiceId) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              paymentId: invoiceId,
              paymentUrl: invoiceUrl || paymentUrl,
            },
          });
          return {
            ...payment,
            paymentId: invoiceId,
            paymentUrl: paymentUrl,
          };
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          return { ...payment, paymentUrl };
        }
        throw new BadRequestException(
          e instanceof Error ? e.message : 'Payment provider unavailable',
        );
      }
    }

    return {
      ...payment,
      paymentUrl,
    };
  }

  async createSubscriptionPayment(userId: string, subscriptionId: string) {
    // Get subscription details
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
    }

    // Create payment for subscription
    return this.createPayment(userId, parseFloat(subscription.priceMonthly.toString()), 'USD', subscriptionId);
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

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + subscription.duration);

    // Update payment status
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'completed' },
    });

    // Assign subscription to user
    await this.prisma.user.update({
      where: { id: payment.userId },
      data: {
        subscriptionId: subscription.id,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
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

    return {
      success: true,
      subscription,
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
