import { Event } from '../types';
import { apiClient, ApiResponse } from './api-client';
import { cacheService } from './cache.service';

/**
 * Events Service
 * Handles all event-related API calls with caching
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface EventListItem {
    id: number;
    title: string;
    type: string;
    church_id: number;
    date: string;
    latitude: number;
    longitude: number;
    distance?: number;
    church_name?: string;
}

export interface EventDetails extends Event {
    church_name?: string;
}

export class EventsService {
    /**
     * Get lightweight list of events
     */
    async getEvents(params?: {
        limit?: number;
        offset?: number;
        type?: string;
        upcoming?: boolean;
    }): Promise<EventListItem[]> {
        const cacheKey = `events:list:${JSON.stringify(params || {})}`;

        return cacheService.getOrFetch(
            cacheKey,
            async () => {
                const response = await apiClient.get<ApiResponse<EventListItem[]>>(
                    '/api/events',
                    params
                );
                return response.data || [];
            },
            CACHE_TTL
        );
    }

    /**
     * Get full details for a specific event
     */
    async getEventDetails(id: number): Promise<EventDetails | null> {
        const cacheKey = `events:details:${id}`;

        return cacheService.getOrFetch(
            cacheKey,
            async () => {
                const response = await apiClient.get<ApiResponse<EventDetails>>(
                    `/api/events/${id}`
                );
                return response.data || null;
            },
            CACHE_TTL
        );
    }

    /**
     * Get upcoming events
     */
    async getUpcomingEvents(limit: number = 20): Promise<EventListItem[]> {
        const cacheKey = `events:upcoming:${limit}`;

        return cacheService.getOrFetch(
            cacheKey,
            async () => {
                const response = await apiClient.get<ApiResponse<EventListItem[]>>(
                    '/api/events/filter/upcoming',
                    { limit }
                );
                return response.data || [];
            },
            CACHE_TTL
        );
    }

    /**
     * Get events for a specific church
     */
    async getEventsByChurch(
        churchId: number,
        upcoming: boolean = true
    ): Promise<EventListItem[]> {
        const cacheKey = `events:church:${churchId}:${upcoming}`;

        return cacheService.getOrFetch(
            cacheKey,
            async () => {
                const response = await apiClient.get<ApiResponse<EventListItem[]>>(
                    `/api/events/church/${churchId}`,
                    { upcoming }
                );
                return response.data || [];
            },
            CACHE_TTL
        );
    }

    /**
     * Find events within a radius
     */
    async getNearbyEvents(
        lat: number,
        lng: number,
        radius: number = 10,
        limit: number = 50
    ): Promise<EventListItem[]> {
        const cacheKey = `events:nearby:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`;

        return cacheService.getOrFetch(
            cacheKey,
            async () => {
                const response = await apiClient.get<ApiResponse<EventListItem[]>>(
                    '/api/events/search/nearby',
                    { lat, lng, radius, limit }
                );
                return response.data || [];
            },
            CACHE_TTL
        );
    }

    /**
     * Clear all events cache
     */
    async clearCache(): Promise<void> {
        await cacheService.clearAll();
    }
}

// Export singleton instance
export const eventsService = new EventsService();
