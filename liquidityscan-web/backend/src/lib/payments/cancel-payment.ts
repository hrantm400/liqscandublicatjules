import { activeSessions } from './generate-unique-amount';

export async function cancelPayment(userId: string): Promise<boolean> {
    // Find and delete the session
    let deletedKey: string | null = null;

    for (const [amountKey, session] of activeSessions.entries()) {
        if (session.user_id === userId) {
            deletedKey = amountKey;
            break;
        }
    }

    if (deletedKey) {
        activeSessions.delete(deletedKey);
        console.log(`[CancelPayment] Cancelled session for user ${userId}. Amount ${deletedKey} freed.`);

        // In a real app, you might also want to update the database
        // "UPDATE payments SET status = 'cancelled' WHERE user_id = $1 AND status = 'pending'"
        return true;
    }

    return false;
}
