import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api-client';
import { ChurchDetails, churchesService, ChurchListItem } from '../services/churches.service';

/**
 * Hook for managing churches data
 */

export interface UseChurchesResult {
    churches: ChurchListItem[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useChurches(params?: {
    limit?: number;
    offset?: number;
    lat?: number;
    lng?: number;
    radius?: number;
}): UseChurchesResult {
    const [churches, setChurches] = useState<ChurchListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchChurches = useCallback(async () => {
        try {
            console.log('🏛️ Fetching churches with params:', params);
            setLoading(true);
            setError(null);
            const data = await churchesService.getChurches(params);
            console.log('✅ Churches loaded:', data.length, 'churches');
            setChurches(data);
        } catch (err) {
            console.error('❌ Error fetching churches:', err);
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to load churches');
            }
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(params)]);

    useEffect(() => {
        fetchChurches();
    }, [fetchChurches]);

    return {
        churches,
        loading,
        error,
        refresh: fetchChurches,
    };
}

/**
 * Hook for managing church details
 */

export interface UseChurchDetailsResult {
    church: ChurchDetails | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useChurchDetails(id: number | null): UseChurchDetailsResult {
    const [church, setChurch] = useState<ChurchDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchChurchDetails = useCallback(async () => {
        if (!id) {
            setChurch(null);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await churchesService.getChurchDetails(id);
            setChurch(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to load church details');
            }
            console.error('Error fetching church details:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchChurchDetails();
    }, [fetchChurchDetails]);

    return {
        church,
        loading,
        error,
        refresh: fetchChurchDetails,
    };
}

/**
 * Hook for nearby churches
 */

export interface UseNearbyChurchesResult {
    churches: ChurchListItem[];
    loading: boolean;
    error: string | null;
    search: (lat: number, lng: number, radius?: number) => Promise<void>;
}

export function useNearbyChurches(): UseNearbyChurchesResult {
    const [churches, setChurches] = useState<ChurchListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const search = useCallback(async (lat: number, lng: number, radius: number = 10) => {
        try {
            setLoading(true);
            setError(null);
            const data = await churchesService.getNearbyChurches(lat, lng, radius);
            setChurches(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to search nearby churches');
            }
            console.error('Error searching nearby churches:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        churches,
        loading,
        error,
        search,
    };
}
