import Constants from 'expo-constants';

/**
 * API Client Configuration
 * Centralized HTTP client for all API requests
 */

// Get API base URL from environment or use default
const getApiBaseUrl = (): string => {
    // Try to get from expo config
    const expoConfig = Constants.expoConfig;
    const apiUrl = expoConfig?.extra?.apiUrl;

    console.log('🔧 API Configuration:', {
        expoConfig: expoConfig?.extra,
        apiUrl,
    });

    if (apiUrl) {
        console.log('✅ Using API URL from config:', apiUrl);
        return apiUrl;
    }

    // Fallback to localhost (will need to be changed for physical devices)
    // For Expo: use your machine's IP address instead of localhost
    console.log('⚠️ Using fallback localhost URL');
    return 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_TIMEOUT = 10000; // 10 seconds

console.log('🌐 API Client initialized with base URL:', API_BASE_URL);

interface RequestOptions extends RequestInit {
    timeout?: number;
}

/**
 * Enhanced fetch with timeout support
 */
const fetchWithTimeout = async (
    url: string,
    options: RequestOptions = {}
): Promise<Response> => {
    const { timeout = API_TIMEOUT, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
                ...fetchOptions.headers,
            },
        });

        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
    pagination?: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

/**
 * API Error class
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public originalError?: any
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Main API Client
 */
export class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
        try {
            const url = new URL(`${this.baseUrl}${endpoint}`);

            // Add query parameters
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        url.searchParams.append(key, String(value));
                    }
                });
            }

            const response = await fetchWithTimeout(url.toString(), {
                method: 'GET',
            });

            if (!response.ok) {
                throw new ApiError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status
                );
            }

            const data = await response.json();
            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            // Network errors
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new ApiError('Request timeout', 408, error);
                }
                throw new ApiError(
                    `Network error: ${error.message}`,
                    undefined,
                    error
                );
            }

            throw new ApiError('Unknown error occurred');
        }
    }

    /**
     * POST request
     */
    async post<T>(endpoint: string, body?: any): Promise<T> {
        try {
            const response = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                throw new ApiError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status
                );
            }

            const data = await response.json();
            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new ApiError('Request timeout', 408, error);
                }
                throw new ApiError(
                    `Network error: ${error.message}`,
                    undefined,
                    error
                );
            }

            throw new ApiError('Unknown error occurred');
        }
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.get<{ status: string }>('/health');
            return response.status === 'ok';
        } catch {
            return false;
        }
    }
}

// Export singleton instance
export const apiClient = new ApiClient();
