import { userApi } from './userApi';

// Export an instance that is backwards compatible with the old api.ts
export const api = {
  get: <T>(url: string, params?: Record<string, string>) => {
    let finalUrl = url;
    if (params) {
      const searchParams = new URLSearchParams(params);
      finalUrl += `?${searchParams.toString()}`;
    }
    return userApi.request<T>(finalUrl);
  },
  post: <T>(url: string, data?: any) => userApi.request<T>(url, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: <T>(url: string, data?: any) => userApi.request<T>(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: <T>(url: string) => userApi.request<T>(url, {
    method: 'DELETE',
  }),
  patch: <T>(url: string, data?: any) => userApi.request<T>(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};
