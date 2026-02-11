// Determine API URL based on environment
// If running through Cloudflare Tunnel, use relative path (proxied through Vite)
// Otherwise use explicit URL
export const getApiBaseUrl = () => {
  // Check if VITE_API_URL is explicitly set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Production build or same-origin: use relative /api (Nginx proxies to backend)
  if (import.meta.env.PROD || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
    return '/api';
  }
  
  // Local development: backend usually on 3000 or 3002
  return 'http://localhost:3002/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.getToken = () => {
      // Try to get token from Zustand store (auth-storage)
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          if (parsed?.state?.token) {
            return parsed.state.token;
          }
        }
      } catch (e) {
        // Fallback to old method
      }
      // Fallback to direct localStorage
      return localStorage.getItem('token');
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[ApiClient] Request to:', endpoint, 'with token:', token.substring(0, 20) + '...');
    } else {
      console.warn('[ApiClient] No token found for request to:', endpoint);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error('[ApiClient] Request failed:', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // For 403 errors, provide more specific message
      if (response.status === 403) {
        throw new Error(errorData.message || 'Access forbidden. Please check if you are logged in as admin and your email is in ADMIN_EMAILS list.');
      }

      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async register(data: { email: string; password: string; name?: string }) {
    return this.request<{ user: any; accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ user: any; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile() {
    return this.request<any>('/auth/me');
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async fastLogin() {
    return this.request<{ user: any; accessToken: string; refreshToken: string }>('/auth/fast-login', {
      method: 'POST',
    });
  }


  // Payments
  async createPayment(amount: number, currency?: string, subscriptionId?: string) {
    return this.request<any>('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ amount, currency, subscriptionId }),
    });
  }

  async createSubscriptionPayment(subscriptionId: string) {
    return this.request<any>(`/payments/subscription/${subscriptionId}`, {
      method: 'POST',
    });
  }

  async getPaymentStatus(paymentId: string) {
    return this.request<any>(`/payments/status/${paymentId}`);
  }

  // Admin
  async getAnalytics() {
    return this.request<any>('/admin/analytics');
  }

  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    return this.request<{ data: any[]; total: number; page: number; pageCount: number }>(
      `/admin/users?${queryParams.toString()}`
    );
  }

  async updateUser(id: string, data: { name?: string; isAdmin?: boolean }) {
    return this.request<any>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request<void>(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategoriesAdmin() {
    return this.request<any[]>('/admin/categories');
  }

  async createCategory(data: { name: string; slug: string; description?: string; icon?: string; order?: number }) {
    return this.request<any>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: { name?: string; slug?: string; description?: string; icon?: string; order?: number }) {
    return this.request<any>(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string) {
    return this.request<void>(`/admin/categories/${id}`, {
      method: 'DELETE',
    });
  }


  async getPaymentsAdmin(params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.userId) queryParams.append('userId', params.userId);

    return this.request<{ data: any[]; total: number; page: number; pageCount: number }>(
      `/admin/payments?${queryParams.toString()}`
    );
  }

  // Courses
  async getCourses() {
    return this.request<any[]>('/courses');
  }

  async getCourse(id: string) {
    return this.request<any>(`/courses/${id}`);
  }

  async createCourse(data: any) {
    return this.request<any>('/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCourse(courseId: string, data: { title?: string; description?: string; coverUrl?: string; difficulty?: string }) {
    return this.request<any>(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getChapters(courseId: string) {
    return this.request<any[]>(`/courses/${courseId}/chapters`);
  }

  async createChapter(courseId: string, data: any) {
    return this.request<any>(`/courses/${courseId}/chapters`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChapter(id: string, data: any) {
    return this.request<any>(`/courses/chapters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteChapter(id: string) {
    return this.request<void>(`/courses/chapters/${id}`, {
      method: 'DELETE',
    });
  }

  async createLesson(chapterId: string, data: any) {
    return this.request<any>(`/courses/chapters/${chapterId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLesson(lessonId: string, data: { title?: string; description?: string; videoUrl?: string; videoProvider?: string; order?: number }) {
    return this.request<any>(`/courses/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLesson(lessonId: string) {
    return this.request<void>(`/courses/lessons/${lessonId}`, {
      method: 'DELETE',
    });
  }

  async deleteCourse(id: string) {
    return this.request<void>(`/courses/${id}`, {
      method: 'DELETE',
    });
  }

  // Subscriptions
  async getSubscriptions() {
    return this.request<any[]>('/subscriptions');
  }

  async getSubscription(id: string) {
    return this.request<any>(`/subscriptions/${id}`);
  }

  async getMySubscription() {
    return this.request<any>('/subscriptions/user/me');
  }

  async subscribeToPlan(subscriptionId: string) {
    return this.request<any>(`/subscriptions/${subscriptionId}/subscribe`, {
      method: 'POST',
    });
  }

  async cancelSubscription() {
    // This will be implemented later - for now just update user subscription status
    return this.request<any>('/subscriptions/user/me', {
      method: 'DELETE',
    });
  }

  // Admin Subscriptions
  async createSubscription(data: any) {
    return this.request<any>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubscription(id: string, data: any) {
    return this.request<any>(`/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSubscription(id: string) {
    return this.request<void>(`/subscriptions/${id}`, {
      method: 'DELETE',
    });
  }

  async getSubscriptionsStats() {
    return this.request<any>('/subscriptions/stats');
  }
}

export const userApi = new ApiClient(API_BASE_URL);

// Export for backward compatibility
export const adminApi = userApi;
export const authApi = userApi;
export const paymentsApi = userApi;
