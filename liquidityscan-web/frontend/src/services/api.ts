import { userApi, adminApi, authApi, paymentsApi } from './userApi';

// Export api for backward compatibility
export const api = userApi;
export { userApi, adminApi, authApi, paymentsApi };
