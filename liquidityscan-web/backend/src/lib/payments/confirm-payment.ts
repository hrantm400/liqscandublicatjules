import { PlanType, Network } from './types';
import { activeSessions } from './generate-unique-amount';

export async function confirmPayment(
    userId: string,
    amount: number,
    planType: PlanType,
    network: Network,
    txHash: string,
    prisma: any
): Promise<boolean> {
    // 1. Delete session from active map to free the amount
    let deletedKey: string | null = null;
    for (const [amountKey, session] of activeSessions.entries()) {
        if (session.user_id === userId) {
            deletedKey = amountKey;
            break;
        }
    }

    if (deletedKey) {
        activeSessions.delete(deletedKey);
    }

    console.log(`[ConfirmPayment] SUCCESS! User: ${userId}, Amount: ${amount}, Plan: ${planType}, Network: ${network}, TX: ${txHash}`);

    // 2. Database Action Here
    try {
        const tier = planType === 'first_month' ? 'PAID_MONTHLY' : 'PAID_MONTHLY';
        const isAnnual = planType !== 'first_month' && amount > 400; // Just in case we expand to Annual
        const realTier = isAnnual ? 'PAID_ANNUAL' : tier;

        const durationDays = isAnnual ? 365 : 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        await prisma.user.update({
            where: { id: userId },
            data: {
                tier: realTier,
                subscriptionStatus: 'active',
                subscriptionExpiresAt: expiresAt,
            }
        });

        await prisma.payment.create({
            data: {
                userId,
                amount,
                currency: 'USDT',
                status: 'completed',
                paymentMethod: `crypto_${network.toLowerCase()}`,
                metadata: {
                    planType,
                    network,
                    txHash,
                    confirmedAt: new Date()
                }
            }
        });

        return true;
    } catch (err) {
        console.error(`[ConfirmPayment] Failed to save to DB for user ${userId}`, err);
        return false;
    }
}
