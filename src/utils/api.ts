/**
 * API Utilities
 * 
 * Fetch wrapper with CORS fallback and caching support.
 */

import type { CacheEntry } from '@/types/api';

/** Cache TTL in milliseconds (5 minutes) */
export const CACHE_TTL = 5 * 60 * 1000;

/** CORS proxy URL */
const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * Generate cache key for token data
 */
export function getCacheKey(type: string, chainId: number, tokenAddress: string): string {
  return `holder_${type}_${chainId}_${tokenAddress.toLowerCase()}`;
}

/**
 * Get cached data if still valid
 */
export function getCached<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const entry: CacheEntry<T> = JSON.parse(raw);
    
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Store data in cache
 */
export function setCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    // Storage full or disabled - silently fail
    console.warn('Failed to cache data:', e);
  }
}

/**
 * Clear cache for a specific token
 */
export function clearCache(chainId: number, tokenAddress: string): void {
  if (typeof window === 'undefined') return;
  
  const patterns = ['cluster', 'token', 'p2p'];
  patterns.forEach(type => {
    localStorage.removeItem(getCacheKey(type, chainId, tokenAddress));
  });
}

/**
 * Clear all holder cache data
 */
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

/**
 * Fetch with automatic CORS proxy fallback
 */
export async function fetchWithFallback<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // Try direct fetch first
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (response.ok) {
      return response.json();
    }
  } catch (directError) {
    console.log('Direct fetch failed, trying CORS proxy:', directError);
  }
  
  // Try with CORS proxy
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
  
  const response = await fetch(proxyUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch with caching
 */
export async function fetchWithCache<T>(
  cacheKey: string,
  url: string,
  options?: RequestInit
): Promise<T> {
  // Check cache first
  const cached = getCached<T>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch fresh data
  const data = await fetchWithFallback<T>(url, options);
  
  // Cache the result
  setCache(cacheKey, data);
  
  return data;
}

/**
 * Get recently searched tokens from localStorage
 */
export interface RecentToken {
  address: string;
  chainId: number;
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
    
    // Remove existing entry for same address
    const filtered = recent.filter(
      t => t.address.toLowerCase() !== token.address.toLowerCase()
    );
    
    // Add new entry at start
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
