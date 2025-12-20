import { apiClient, ApiResponse } from './api-client';
import { cacheService } from './cache.service';

/**
 * Search Service
 * Handles all search-related API calls
 */

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes (shorter for search)

export interface SearchResult {
    churches: any[];
    events: any[];
}

export class SearchService {
    /**
     * Global search (churches + events)
     */
    async globalSearch(query: string): Promise<SearchResult> {
        if (!query || query.trim().length < 2) {
            return { churches: [], events: [] };
        }

        const cacheKey = `search:global:${query.toLowerCase()}`;

        return cacheService.getOrFetch(
            cacheKey,
            async () => {
                const response = await apiClient.get<ApiResponse<SearchResult>>(
                    '/api/search',
                    { q: query }
                );
                return response.data || { churches: [], events: [] };
            },
            CACHE_TTL
        );
    }

    /**
     * Search churches only
     */
    async searchChurches(query: string): Promise<any[]> {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const cacheKey = `search:churches:${query.toLowerCase()}`;

        return cacheService.getOrFetch(
            cacheKey,
            async () => {
                const response = await apiClient.get<ApiResponse<any[]>>(
                    '/api/search/churches',
                    { q: query }
                );
                return response.data || [];
            },
            CACHE_TTL
        );
    }

    /**
     * Search events only
     */
    async searchEvents(query: string): Promise<any[]> {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const cacheKey = `search:events:${query.toLowerCase()}`;

        return cacheService.getOrFetch(
            cacheKey,
            async () => {
                const response = await apiClient.get<ApiResponse<any[]>>(
                    '/api/search/events',
                    { q: query }
                );
                return response.data || [];
            },
            CACHE_TTL
        );
    }
}

// Export singleton instance
export const searchService = new SearchService();
