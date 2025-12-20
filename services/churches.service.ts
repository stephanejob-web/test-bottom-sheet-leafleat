import { apiClient, ApiResponse } from './api-client';
import { cacheService } from './cache.service';

/**
 * Churches Service
 * Handles all church-related API calls with caching
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface ChurchListItem {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    distance?: number;
}

export interface ChurchDetails {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
    description?: string;
    parking?: boolean;
    services?: string[];
    tags?: string[];
    upcomingEvents?: any[];
}


export class ChurchesService {
    /**
     * Get lightweight list of churches for map display
     */
    async getChurches(params?: {
        limit?: number;
        offset?: number;
        lat?: number;
        lng?: number;
        radius?: number;
    }): Promise<ChurchListItem[]> {
        const cacheKey = `churches:list:${JSON.stringify(params || {})}`;

        return cacheService.getOrFetch(
            cacheKey,
            async () => {
                const response = await apiClient.get<ApiResponse<ChurchListItem[]>>(
                    '/api/churches',
                    params
                );
                return response.data || [];
            },
            CACHE_TTL
        );
    }

    /**
     * Get full details for a specific church
     */
    async getChurchDetails(id: number): Promise<ChurchDetails | null> {
        const cacheKey = `churches:details:${id}`;

        return cacheService.getOrFetch(
            cacheKey,
            async () => {
                const response = await apiClient.get<ApiResponse<ChurchDetails>>(
                    `/api/churches/${id}`
                );
                return response.data || null;
            },
            CACHE_TTL
        );
    }

    /**
     * Find churches within a radius
     */
    async getNearbyChurches(
        lat: number,
        lng: number,
        radius: number = 10,
        limit: number = 50
    ): Promise<ChurchListItem[]> {
        const cacheKey = `churches:nearby:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`;

        return cacheService.getOrFetch(
            cacheKey,
            async () => {
                const response = await apiClient.get<ApiResponse<ChurchListItem[]>>(
                    '/api/churches/search/nearby',
                    { lat, lng, radius, limit }
                );
                return response.data || [];
            },
            CACHE_TTL
        );
    }

    /**
     * Clear all churches cache
     */
    async clearCache(): Promise<void> {
        // This is a simple implementation - in production you might want
        // to track cache keys more precisely
        await cacheService.clearAll();
    }
}

// Export singleton instance
export const churchesService = new ChurchesService();
