import { getApiBaseUrl } from './userApi';

export enum DataProvider {
    BINANCE = 'BINANCE',
    COINRAY = 'COINRAY'
}

export interface SystemSettings {
    id: string;
    activeProvider: DataProvider;
    updatedAt: string;
}

const getToken = () => {
    try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
            const parsed = JSON.parse(authStorage);
            if (parsed?.state?.token) {
                return parsed.state.token;
            }
        }
    } catch (e) {
        console.error('Error parsing auth token', e);
    }
    return localStorage.getItem('token');
};

export const settingsApi = {
    getSettings: async (): Promise<SystemSettings> => {
        const baseUrl = getApiBaseUrl();
        const token = getToken();
        const res = await fetch(`${baseUrl}/settings`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        if (!res.ok) throw new Error('Failed to fetch settings');
        return res.json();
    },

    updateProvider: async (provider: DataProvider): Promise<SystemSettings> => {
        const baseUrl = getApiBaseUrl();
        const token = getToken();
        const res = await fetch(`${baseUrl}/settings/provider`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ provider }),
        });
        if (!res.ok) throw new Error('Failed to update provider');
        return res.json();
    }
};
