import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api-client';
import { SearchResult, searchService } from '../services/search.service';
import { useDebounce } from './use-debounce';

/**
 * Hook for search functionality with debouncing
 */

export interface UseSearchResult {
    results: SearchResult;
    loading: boolean;
    error: string | null;
    search: (query: string) => void;
    clear: () => void;
}

export function useSearch(debounceMs: number = 300): UseSearchResult {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult>({ churches: [], events: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debouncedQuery = useDebounce(query, debounceMs);

    // Perform search when debounced query changes
    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setResults({ churches: [], events: [] });
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await searchService.globalSearch(searchQuery);
            setResults(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Search failed');
            }
            console.error('Error searching:', err);
            setResults({ churches: [], events: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    // Effect to trigger search when debounced query changes
    useEffect(() => {
        performSearch(debouncedQuery);
    }, [debouncedQuery, performSearch]);

    const search = useCallback((newQuery: string) => {
        setQuery(newQuery);
        if (newQuery.trim().length >= 2) {
            setLoading(true);
        }
    }, []);

    const clear = useCallback(() => {
        setQuery('');
        setResults({ churches: [], events: [] });
        setError(null);
        setLoading(false);
    }, []);

    return {
        results,
        loading,
        error,
        search,
        clear,
    };
}

/**
 * Hook for searching churches only
 */

export interface UseSearchChurchesResult {
    churches: any[];
    loading: boolean;
    error: string | null;
    search: (query: string) => void;
    clear: () => void;
}

export function useSearchChurches(debounceMs: number = 300): UseSearchChurchesResult {
    const [query, setQuery] = useState('');
    const [churches, setChurches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debouncedQuery = useDebounce(query, debounceMs);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setChurches([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await searchService.searchChurches(searchQuery);
            setChurches(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Search failed');
            }
            console.error('Error searching churches:', err);
            setChurches([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        performSearch(debouncedQuery);
    }, [debouncedQuery, performSearch]);

    const search = useCallback((newQuery: string) => {
        setQuery(newQuery);
        if (newQuery.trim().length >= 2) {
            setLoading(true);
        }
    }, []);

    const clear = useCallback(() => {
        setQuery('');
        setChurches([]);
        setError(null);
        setLoading(false);
    }, []);

    return {
        churches,
        loading,
        error,
        search,
        clear,
    };
}

/**
 * Hook for searching events only
 */

export interface UseSearchEventsResult {
    events: any[];
    loading: boolean;
    error: string | null;
    search: (query: string) => void;
    clear: () => void;
}

export function useSearchEvents(debounceMs: number = 300): UseSearchEventsResult {
    const [query, setQuery] = useState('');
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debouncedQuery = useDebounce(query, debounceMs);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setEvents([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await searchService.searchEvents(searchQuery);
            setEvents(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Search failed');
            }
            console.error('Error searching events:', err);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        performSearch(debouncedQuery);
    }, [debouncedQuery, performSearch]);

    const search = useCallback((newQuery: string) => {
        setQuery(newQuery);
        if (newQuery.trim().length >= 2) {
            setLoading(true);
        }
    }, []);

    const clear = useCallback(() => {
        setQuery('');
        setEvents([]);
        setError(null);
        setLoading(false);
    }, []);

    return {
        events,
        loading,
        error,
        search,
        clear,
    };
}
