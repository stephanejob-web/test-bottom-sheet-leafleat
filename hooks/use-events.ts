import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api-client';
import { EventDetails, EventListItem, eventsService } from '../services/events.service';

/**
 * Hook for managing events data
 */

export interface UseEventsResult {
    events: EventListItem[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useEvents(params?: {
    limit?: number;
    offset?: number;
    type?: string;
    upcoming?: boolean;
}): UseEventsResult {
    const [events, setEvents] = useState<EventListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await eventsService.getEvents(params);
            setEvents(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to load events');
            }
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(params)]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return {
        events,
        loading,
        error,
        refresh: fetchEvents,
    };
}

/**
 * Hook for managing event details
 */

export interface UseEventDetailsResult {
    event: EventDetails | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useEventDetails(id: number | null): UseEventDetailsResult {
    const [event, setEvent] = useState<EventDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEventDetails = useCallback(async () => {
        if (!id) {
            setEvent(null);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await eventsService.getEventDetails(id);
            setEvent(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to load event details');
            }
            console.error('Error fetching event details:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchEventDetails();
    }, [fetchEventDetails]);

    return {
        event,
        loading,
        error,
        refresh: fetchEventDetails,
    };
}

/**
 * Hook for upcoming events
 */

export interface UseUpcomingEventsResult {
    events: EventListItem[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useUpcomingEvents(limit: number = 20): UseUpcomingEventsResult {
    const [events, setEvents] = useState<EventListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUpcomingEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await eventsService.getUpcomingEvents(limit);
            setEvents(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to load upcoming events');
            }
            console.error('Error fetching upcoming events:', err);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchUpcomingEvents();
    }, [fetchUpcomingEvents]);

    return {
        events,
        loading,
        error,
        refresh: fetchUpcomingEvents,
    };
}

/**
 * Hook for nearby events
 */

export interface UseNearbyEventsResult {
    events: EventListItem[];
    loading: boolean;
    error: string | null;
    search: (lat: number, lng: number, radius?: number) => Promise<void>;
}

export function useNearbyEvents(): UseNearbyEventsResult {
    const [events, setEvents] = useState<EventListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const search = useCallback(async (lat: number, lng: number, radius: number = 10) => {
        try {
            setLoading(true);
            setError(null);
            const data = await eventsService.getNearbyEvents(lat, lng, radius);
            setEvents(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to search nearby events');
            }
            console.error('Error searching nearby events:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        events,
        loading,
        error,
        search,
    };
}
