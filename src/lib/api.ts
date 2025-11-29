/**
 * API Library
 * 
 * Comprehensive API client with error handling, rate limiting, retries, and caching.
 * This is the main entry point for all OKX API interactions.
 */

import type { 
  ChainId, 
  ClusterResponse, 
  TokenInfoResponse, 
  P2PTransactionResponse,
  P2PTransactionRequest,
  CacheEntry 
} from '@/types/api';

// =============================================================================
// Configuration
// =============================================================================

/** API Endpoints */
export const API_ENDPOINTS = {
  CLUSTER: 'https://web3.okx.com/priapi/v1/holder-intelligence/cluster/info',
  TOKEN_INFO: 'https://web3.okx.com/priapi/v1/dx/market/v2/latest/info',
  P2P_TRANSACTIONS: 'https://web3.okx.com/priapi/v1/wallet/tx/order/list',
} as const;

/** CORS Proxy URLs (in priority order) - external proxies first, in-house as fallback */
const CORS_PROXIES = [
  'https://corsproxy.io/?',             // Third-party (free, fast)
  'https://api.allorigins.win/raw?url=', // Third-party fallback
  'https://thingproxy.freeboard.io/fetch/', // Third-party fallback
  '/api/proxy?url=',                     // In-house API route (fallback, saves serverless costs)
] as const;

/** Cache TTL values */
export const CACHE_TTL = {
  /** Cluster/holder data - 1 hour */
  CLUSTER: 60 * 60 * 1000,
  /** Token info - 1 hour */
  TOKEN_INFO: 60 * 60 * 1000,
  /** P2P transactions - 15 minutes (changes more frequently) */
  P2P: 15 * 60 * 1000,
  /** Favorites - persistent (no TTL) */
  FAVORITES: Infinity,
} as const;

/** Retry configuration */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
} as const;

/** Rate limiting configuration */
const RATE_LIMIT = {
  maxRequestsPerMinute: 30,
  windowMs: 60 * 1000,
} as const;

// =============================================================================
// Error Types
// =============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: ApiErrorCode,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiErrorCode = 
  | 'NETWORK_ERROR'
  | 'CORS_ERROR'
  | 'RATE_LIMITED'
  | 'INVALID_RESPONSE'
  | 'TOKEN_NOT_FOUND'
  | 'CHAIN_NOT_SUPPORTED'
  | 'INVALID_ADDRESS'
  | 'TIMEOUT'
  | 'UNKNOWN';

/** User-friendly error messages */
const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  CORS_ERROR: 'Unable to fetch data. Please try again in a moment.',
  RATE_LIMITED: 'Too many requests. Please wait a moment before trying again.',
  INVALID_RESPONSE: 'Received unexpected data from the server.',
  TOKEN_NOT_FOUND: 'Token not found on this chain. Try selecting a different chain.',
  CHAIN_NOT_SUPPORTED: 'This chain is not supported.',
  INVALID_ADDRESS: 'Invalid token address format.',
  TIMEOUT: 'Request timed out. Please try again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

export function getErrorMessage(code: ApiErrorCode): string {
  return ERROR_MESSAGES[code];
}

// =============================================================================
// Rate Limiting
// =============================================================================

interface RateLimitState {
  requests: number[];
}

const rateLimitState: RateLimitState = {
  requests: [],
};

function checkRateLimit(): void {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;
  
  // Clean up old requests
  rateLimitState.requests = rateLimitState.requests.filter(t => t > windowStart);
  
  if (rateLimitState.requests.length >= RATE_LIMIT.maxRequestsPerMinute) {
    const oldestRequest = rateLimitState.requests[0];
    const waitTime = Math.ceil((oldestRequest + RATE_LIMIT.windowMs - now) / 1000);
    throw new ApiError(
      `Rate limit exceeded. Please wait ${waitTime} seconds.`,
      'RATE_LIMITED'
    );
  }
  
  rateLimitState.requests.push(now);
}

// =============================================================================
// Caching
// =============================================================================

type CacheType = 'cluster' | 'token' | 'p2p';

function getCacheKey(type: CacheType, chainId: ChainId, tokenAddress: string): string {
  return `holder_${type}_${chainId}_${tokenAddress.toLowerCase()}`;
}

function getCached<T>(key: string, ttl: number): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const entry: CacheEntry<T> = JSON.parse(raw);
    
    if (ttl !== Infinity && Date.now() - entry.timestamp > ttl) {
      localStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('Failed to cache data:', e);
  }
}

/** Clear cache for a specific token */
export function clearTokenCache(chainId: ChainId, tokenAddress: string): void {
  if (typeof window === 'undefined') return;
  
  const types: CacheType[] = ['cluster', 'token', 'p2p'];
  types.forEach(type => {
    localStorage.removeItem(getCacheKey(type, chainId, tokenAddress));
  });
}

/** Clear all holder cache data */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('holder_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

// =============================================================================
// Retry Logic
// =============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry rate limit errors
      if (error instanceof ApiError && error.code === 'RATE_LIMITED') {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = calculateBackoff(attempt);
        console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError ?? new ApiError('Max retries exceeded', 'NETWORK_ERROR');
}

// =============================================================================
// Core Fetch Function
// =============================================================================

async function fetchApi<T>(
  url: string,
  options?: RequestInit & { timeout?: number }
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options ?? {};
  
  // Check rate limit
  checkRateLimit();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const fetchWithProxy = async (proxyUrl: string | null): Promise<T> => {
    let targetUrl: string;
    
    if (!proxyUrl) {
      // Direct fetch
      targetUrl = url;
    } else if (proxyUrl.startsWith('/api/')) {
      // Local Next.js API proxy - use query parameter
      targetUrl = `${proxyUrl}${encodeURIComponent(url)}`;
    } else {
      // External CORS proxies
      targetUrl = `${proxyUrl}${encodeURIComponent(url)}`;
    }
    
    try {
      const response = await fetch(targetUrl, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions?.headers,
        },
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new ApiError('Rate limited by server', 'RATE_LIMITED', 429);
        }
        if (response.status === 404) {
          throw new ApiError('Resource not found', 'TOKEN_NOT_FOUND', 404);
        }
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          'NETWORK_ERROR',
          response.status
        );
      }
      
      const data = await response.json();
      
      // Check for API-level errors
      if (data.code !== 0 && data.code !== undefined) {
        throw new ApiError(
          data.msg || data.error_message || 'API returned error',
          'INVALID_RESPONSE',
          undefined,
          data
        );
      }
      
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timed out', 'TIMEOUT');
      }
      throw error;
    }
  };
  
  // Always use proxies (direct fetch commented out to avoid CORS errors in console)
  // This uses third-party proxies first, then falls back to in-house /api/proxy
  for (const proxy of CORS_PROXIES) {
    try {
      return await fetchWithProxy(proxy);
    } catch (proxyError) {
      // Silent fallback - don't log proxy failures to reduce console noise
      continue;
    }
  }
  
  throw new ApiError('All proxy methods failed', 'CORS_ERROR');
  
  /* COMMENTED OUT: Direct fetch attempts (causes CORS errors in browser console)
  // In production, skip direct fetch and go straight to proxy (CORS will always fail)
  // In development, try direct first for debugging
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  
  if (isProduction) {
    // Try proxies
    for (const proxy of CORS_PROXIES) {
      try {
        return await fetchWithProxy(proxy);
      } catch (proxyError) {
        console.log(`Proxy ${proxy} failed, trying next...`);
        continue;
      }
    }
    throw new ApiError('All proxy methods failed', 'CORS_ERROR');
  }
  
  // Development: try direct fetch first
  try {
    return await fetchWithProxy(null);
  } catch (directError) {
    console.log('Direct fetch failed, trying CORS proxies...');
    
    for (const proxy of CORS_PROXIES) {
      try {
        return await fetchWithProxy(proxy);
      } catch (proxyError) {
        console.log(`Proxy ${proxy} failed, trying next...`);
        continue;
      }
    }
    
    throw new ApiError(
      'All request methods failed',
      'CORS_ERROR',
      undefined,
      directError
    );
  }
  */
  
  clearTimeout(timeoutId);
}

// =============================================================================
// Public API Functions
// =============================================================================

/**
 * Fetch cluster/holder data for a token
 */
export async function fetchClusterData(
  tokenAddress: string,
  chainId: ChainId,
  options?: { skipCache?: boolean }
): Promise<ClusterResponse> {
  const cacheKey = getCacheKey('cluster', chainId, tokenAddress);
  
  // Check cache unless skipping
  if (!options?.skipCache) {
    const cached = getCached<ClusterResponse>(cacheKey, CACHE_TTL.CLUSTER);
    if (cached) {
      console.log('Returning cached cluster data');
      return cached;
    }
  }
  
  const url = `${API_ENDPOINTS.CLUSTER}?chainId=${chainId}&chainIndex=${chainId}&tokenAddress=${tokenAddress}&t=${Date.now()}`;
  
  const data = await fetchWithRetry(() => fetchApi<ClusterResponse>(url));
  
  // Cache successful response
  setCache(cacheKey, data);
  
  return data;
}

/**
 * Fetch token metadata and market info
 */
export async function fetchTokenInfo(
  tokenAddress: string,
  chainId: ChainId,
  options?: { skipCache?: boolean }
): Promise<TokenInfoResponse> {
  const cacheKey = getCacheKey('token', chainId, tokenAddress);
  
  if (!options?.skipCache) {
    const cached = getCached<TokenInfoResponse>(cacheKey, CACHE_TTL.TOKEN_INFO);
    if (cached) {
      console.log('Returning cached token info');
      return cached;
    }
  }
  
  const url = `${API_ENDPOINTS.TOKEN_INFO}?tokenContractAddress=${tokenAddress}&chainId=${chainId}&t=${Date.now()}`;
  
  const data = await fetchWithRetry(() => fetchApi<TokenInfoResponse>(url));
  
  setCache(cacheKey, data);
  
  return data;
}

/**
 * Fetch P2P transactions for wallet addresses
 */
export async function fetchP2PTransactions(
  request: Omit<P2PTransactionRequest, 'lastRowId' | 'hideValuelessNft'> & { lastRowId?: string },
  options?: { skipCache?: boolean }
): Promise<P2PTransactionResponse> {
  const chainId = request.chainId as ChainId;
  const addressKey = request.addressList.sort().join('_').substring(0, 50);
  const cacheKey = `holder_p2p_${chainId}_${addressKey}`;
  
  if (!options?.skipCache) {
    const cached = getCached<P2PTransactionResponse>(cacheKey, CACHE_TTL.P2P);
    if (cached) {
      console.log('Returning cached P2P data');
      return cached;
    }
  }
  
  const body: P2PTransactionRequest = {
    addressList: request.addressList,
    chainId: request.chainId,
    startTime: request.startTime,
    endTime: request.endTime,
    limit: request.limit,
    lastRowId: request.lastRowId ?? '',
    hideValuelessNft: true,
  };
  
  const data = await fetchWithRetry(() => 
    fetchApi<P2PTransactionResponse>(API_ENDPOINTS.P2P_TRANSACTIONS, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  );
  
  setCache(cacheKey, data);
  
  return data;
}

/**
 * Fetch both cluster and token data in parallel
 */
export async function fetchTokenFullData(
  tokenAddress: string,
  chainId: ChainId,
  options?: { skipCache?: boolean }
): Promise<{
  cluster: ClusterResponse;
  tokenInfo: TokenInfoResponse;
}> {
  const [cluster, tokenInfo] = await Promise.all([
    fetchClusterData(tokenAddress, chainId, options),
    fetchTokenInfo(tokenAddress, chainId, options),
  ]);
  
  return { cluster, tokenInfo };
}

/**
 * Try to detect which chain a token exists on
 * Returns the first chain where the token is found
 */
export async function detectTokenChain(
  tokenAddress: string
): Promise<ChainId | null> {
  const chains: ChainId[] = [1, 8453, 56, 501]; // Priority order
  
  for (const chainId of chains) {
    try {
      const response = await fetchClusterData(tokenAddress, chainId);
      if (response.data && response.data.tokenName) {
        return chainId;
      }
    } catch {
      continue;
    }
  }
  
  return null;
}

// =============================================================================
// Address Validation
// =============================================================================

/** Validate EVM address format (Ethereum, BSC, Base) */
export function isValidEVMAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/** Validate Solana address format */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/** Validate token address for a specific chain */
export function validateTokenAddress(address: string, chainId: ChainId): boolean {
  if (!address) return false;
  
  if (chainId === 501) {
    return isValidSolanaAddress(address);
  }
  
  return isValidEVMAddress(address);
}

// =============================================================================
// Favorites (Persistent Storage)
// =============================================================================

export interface FavoriteToken {
  address: string;
  chainId: ChainId;
  name: string;
  symbol: string;
  logoUrl?: string;
  addedAt: number;
}

const FAVORITES_KEY = 'holder_favorites';

export function getFavoriteTokens(): FavoriteToken[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addFavoriteToken(token: Omit<FavoriteToken, 'addedAt'>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const favorites = getFavoriteTokens();
    const exists = favorites.some(
      f => f.address.toLowerCase() === token.address.toLowerCase() && f.chainId === token.chainId
    );
    
    if (!exists) {
      favorites.push({ ...token, addedAt: Date.now() });
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  } catch {
    // Silently fail
  }
}

export function removeFavoriteToken(address: string, chainId: ChainId): void {
  if (typeof window === 'undefined') return;
  
  try {
    const favorites = getFavoriteTokens();
    const filtered = favorites.filter(
      f => !(f.address.toLowerCase() === address.toLowerCase() && f.chainId === chainId)
    );
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
  } catch {
    // Silently fail
  }
}

export function isFavoriteToken(address: string, chainId: ChainId): boolean {
  const favorites = getFavoriteTokens();
  return favorites.some(
    f => f.address.toLowerCase() === address.toLowerCase() && f.chainId === chainId
  );
}

// =============================================================================
// Recent Tokens
// =============================================================================

export interface RecentToken {
  address: string;
  chainId: ChainId;
  name: string;
  symbol: string;
  logoUrl?: string;
  timestamp: number;
}

const RECENT_TOKENS_KEY = 'holder_recent_tokens';
const MAX_RECENT_TOKENS = 10;

export function getRecentTokens(): RecentToken[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const raw = localStorage.getItem(RECENT_TOKENS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addRecentToken(token: Omit<RecentToken, 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = getRecentTokens();
    const filtered = recent.filter(
      t => !(t.address.toLowerCase() === token.address.toLowerCase() && t.chainId === token.chainId)
    );
    
    const updated = [
      { ...token, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT_TOKENS);
    
    localStorage.setItem(RECENT_TOKENS_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail
  }
}

export function clearRecentTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_TOKENS_KEY);
}
