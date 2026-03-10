import { PlanType, Network, PaymentSession } from './types';

// In-memory storage for active sessions
// Ключом будет сгенерированная сумма (в виде строки, например "49.01"),
// чтобы максимально быстро проверять коллизии O(1).
export const activeSessions = new Map<string, PaymentSession>();

export function generateUniqueAmount(
    userId: string,
    planType: PlanType,
    network: Network
): { amount: number; walletAddress: string } {
    // 1. Читаем конфиги (с фоллбеками на случай отсутствия .env, хотя они обязательны)
    const basePrice = parseFloat(process.env.BASE_PRICE || '49');
    const firstMonthPrice = parseFloat(process.env.FIRST_MONTH_PRICE || '24.50');
    const walletTrc20 = process.env.WALLET_TRC20 || '';
    const walletBep20 = process.env.WALLET_BEP20 || '';
    const timeoutMinutes = parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '10', 10);

    // 2. Выбираем базовую цену
    const targetBasePrice = planType === 'first_month' ? firstMonthPrice : basePrice;
    const walletAddress = network === 'BEP20' ? walletBep20 : walletTrc20;

    if (!walletAddress) {
        throw new Error(`Wallet address for ${network} is not configured.`);
    }

    // 3. Очищаем просроченные сессии (освобождаем суммы)
    const now = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    for (const [amKey, session] of activeSessions.entries()) {
        if (now - session.started_at > timeoutMs) {
            activeSessions.delete(amKey);
        }
    }

    // 4. Генерируем уникальную сумму
    let uniqueAmount = 0;
    let increment = 1; // начинаем с .01
    const maxIncrement = 99; // до .99

    while (increment <= maxIncrement) {
        const testAmount = parseFloat((targetBasePrice + increment / 100).toFixed(2));
        const testAmountKey = testAmount.toFixed(2); // "49.01"

        if (!activeSessions.has(testAmountKey)) {
            uniqueAmount = testAmount;
            break;
        }
        increment++;
    }

    if (uniqueAmount === 0) {
        throw new Error('No available unique amounts for this plan type at the moment. Please try again in a few minutes.');
    }

    // 5. Сохраняем сессию
    const session: PaymentSession = {
        user_id: userId,
        amount: uniqueAmount,
        plan_type: planType,
        network,
        started_at: now,
    };

    activeSessions.set(uniqueAmount.toFixed(2), session);

    return {
        amount: uniqueAmount,
        walletAddress,
    };
}
