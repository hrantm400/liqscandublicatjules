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

export const settingsApi = {
    getSettings: async (): Promise<SystemSettings> => {
        const baseUrl = getApiBaseUrl();
        const token = localStorage.getItem('auth_token');
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
        const token = localStorage.getItem('auth_token');
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
