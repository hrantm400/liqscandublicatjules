import { PlanType, Network, PaymentSession } from './types';
import { generateUniqueAmount } from './generate-unique-amount';
import { checkPaymentTrc20 } from './check-payment-trc20';
import { checkPaymentBep20 } from './check-payment-bep20';
import { confirmPayment } from './confirm-payment';
import { cancelPayment } from './cancel-payment';

export async function startPaymentSession(
    userId: string,
    network: Network,
    planType: PlanType,
    prisma: any
): Promise<{ amount: number; walletAddress: string; message: string }> {

    // 1. Generate unique amount and save session
    const { amount, walletAddress } = generateUniqueAmount(userId, planType, network);

    // 2. Start Polling in the background
    // NOTE: In a serverless/Next.js environment, a detached setInterval can be killed if the lambda exits.
    // For a persistent Node/NestJS backend, this is okay. If strictly Next.js API Routes, a different 
    // background task runner (like BullMQ or a CRON) might be preferred. Assuming long-running Node here.

    const timeoutMs = parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '10', 10) * 60 * 1000;
    const pollIntervalMs = 15000; // 15 seconds
    let timeElapsed = 0;

    const timer = setInterval(async () => {
        timeElapsed += pollIntervalMs;

        if (timeElapsed >= timeoutMs) {
            clearInterval(timer);
            await cancelPayment(userId);
            console.log(`[PaymentSession] Timeout for user ${userId}. Session cancelled.`);
            return;
        }

        try {
            let result: { confirmed: boolean; tx_hash?: string } = { confirmed: false };

            if (network === 'TRC20') {
                result = await checkPaymentTrc20(amount);
            } else if (network === 'BEP20') {
                result = await checkPaymentBep20(amount);
            }

            if (result.confirmed && result.tx_hash) {
                clearInterval(timer);
                await confirmPayment(userId, amount, planType, network, result.tx_hash, prisma);
                console.log(`[PaymentSession] Payment confirmed for user ${userId}! TX: ${result.tx_hash}`);
            }
        } catch (error) {
            console.error(`[PaymentSession] Polling error for user ${userId}:`, error);
        }
    }, pollIntervalMs);

    return {
        amount,
        walletAddress,
        message: 'Session started. Please send the exact amount within 10 minutes.',
    };
}
