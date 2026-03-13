import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentsService } from "./payments.service";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class TronScannerService implements OnModuleInit {
  private readonly logger = new Logger(TronScannerService.name);
  private readonly walletAddress = process.env.TRC20_WALLET_ADDRESS;
  private isScanning = false;

  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  onModuleInit() {
    if (!this.walletAddress) {
      this.logger.warn(
        "TRC20_WALLET_ADDRESS is not set. Custom TRC20 payment scanning will not work.",
      );
    } else {
      this.logger.log(
        `TronScannerService initialized. Monitoring wallet: ${this.walletAddress}`,
      );
    }
  }

  // Run every 20 seconds
  @Cron("*/20 * * * * *")
  async scanForPayments() {
    if (this.isScanning || !this.walletAddress) return;
    this.isScanning = true;

    try {
      // 1. Get all pending payments that haven't expired
      const now = new Date();
      // Only get payments from the last 15 minutes to be safe
      const fifteenMinsAgo = new Date(now.getTime() - 15 * 60000);

      const pendingPayments = await this.prisma.payment.findMany({
        where: {
          status: "pending",
          paymentMethod: "crypto_trc20",
          createdAt: { gte: fifteenMinsAgo },
        },
      });

      if (pendingPayments.length === 0) {
        this.isScanning = false;
        return;
      }

      // Expire old ones manually just in case
      const toExpire = pendingPayments.filter((p) => {
        const meta = p.metadata as any;
        const expiresAt = meta?.expiresAt
          ? new Date(meta.expiresAt)
          : new Date(p.createdAt.getTime() + 10 * 60000);
        return expiresAt < now;
      });

      for (const expired of toExpire) {
        await this.prisma.payment.update({
          where: { id: expired.id },
          data: { status: "failed" }, // or expired string depending on schema
        });
        this.logger.log(`Payment ${expired.id} expired due to timeout.`);
      }

      const activePending = pendingPayments.filter(
        (p) => !toExpire.includes(p),
      );

      if (activePending.length === 0) {
        this.isScanning = false;
        return;
      }

      // 2. Fetch recent transactions from TronGrid for our wallet
      // TRC20 Contract Address for USDT: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
      const usdtContract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

      const url = `https://api.trongrid.io/v1/accounts/${this.walletAddress}/transactions/trc20?contract_address=${usdtContract}&limit=20`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          // Optional: Add TronGrid API Key if process.env.TRONGRID_API_KEY is available
          ...(process.env.TRONGRID_API_KEY
            ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY }
            : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`TronGrid API error: ${response.status}`);
      }

      const data = await response.json();
      const transactions = data.data || [];

      // 3. Match transactions to active payments
      const processingPromises = [];
      for (const payment of activePending) {
        const pAmountStr = parseFloat(payment.amount.toString()).toFixed(2);

        // Look for a transaction that matches the amount and came AFTER the payment was created
        const match = transactions.find((tx: any) => {
          // Tron amounts are in micro-USDT (6 decimals)
          const txValue = parseFloat(tx.value) / 1000000;
          const txValueStr = txValue.toFixed(2);

          // Must be incoming
          const isIncoming = tx.to === this.walletAddress;

          // Must be after payment creation
          const txTime = new Date(tx.block_timestamp);
          const isAfterCreation =
            txTime >= new Date(payment.createdAt.getTime() - 60000); // 1-minute grace period

          return isIncoming && isAfterCreation && txValueStr === pAmountStr;
        });

        if (match) {
          this.logger.log(
            `Found matching transaction for payment ${payment.id}: TxID ${match.transaction_id}`,
          );

          // We found a match! Process the payment
          const promise = (async () => {
            await this.prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: "completed",
                paymentId: match.transaction_id, // Store TxID
                metadata: {
                  ...((payment.metadata as any) || {}),
                  transactionHash: match.transaction_id,
                  confirmedAt: new Date().toISOString(),
                },
              },
            });

            // Process the subscription upgrade
            await this.paymentsService.processSubscriptionPayment(payment.id);
          })();

          processingPromises.push(promise);
        }
      }

      if (processingPromises.length > 0) {
        await Promise.all(processingPromises);
      }
    } catch (error) {
      this.logger.error("Error scanning Tron blockchain for payments", error);
    } finally {
      this.isScanning = false;
    }
  }
}
