/**
 * Chain Mapping Utilities
 * 
 * Chain ID configuration and address validation for supported networks.
 */

import type { ChainId, ChainConfig } from '@/types/api';

/** Explorer base URLs by chain */
export const CHAIN_EXPLORERS: Record<ChainId, { address: string; token: string; tx: string }> = {
  1: {
    address: 'https://etherscan.io/address/',
    token: 'https://etherscan.io/token/',
    tx: 'https://etherscan.io/tx/',
  },
  56: {
    address: 'https://bscscan.com/address/',
    token: 'https://bscscan.com/token/',
    tx: 'https://bscscan.com/tx/',
  },
  501: {
    address: 'https://solscan.io/account/',
    token: 'https://solscan.io/token/',
    tx: 'https://solscan.io/tx/',
  },
  8453: {
    address: 'https://basescan.org/address/',
    token: 'https://basescan.org/token/',
    tx: 'https://basescan.org/tx/',
  },
};

/**
 * Get explorer URL for an address
 */
export function getAddressExplorerUrl(address: string, chainId: ChainId): string {
  const explorer = CHAIN_EXPLORERS[chainId];
  return explorer ? `${explorer.address}${address}` : '#';
}

/**
 * Get explorer URL for a token
 */
export function getTokenExplorerUrl(tokenAddress: string, chainId: ChainId): string {
  const explorer = CHAIN_EXPLORERS[chainId];
  return explorer ? `${explorer.token}${tokenAddress}` : '#';
}

/**
 * Get explorer URL for a transaction
 */
export function getTxExplorerUrl(txHash: string, chainId: ChainId): string {
  const explorer = CHAIN_EXPLORERS[chainId];
  return explorer ? `${explorer.tx}${txHash}` : '#';
}

/** Supported chain configurations */
export const CHAIN_CONFIG: Record<ChainId, ChainConfig> = {
  1: {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    addressPrefix: '0x',
    addressLength: 42,
  },
  56: {
    id: 56,
    name: 'BSC',
    symbol: 'BNB',
    addressPrefix: '0x',
    addressLength: 42,
  },
  501: {
    id: 501,
    name: 'Solana',
    symbol: 'SOL',
    addressPrefix: '',
    addressLength: 44, // Base58 encoded
  },
  8453: {
    id: 8453,
    name: 'Base',
    symbol: 'ETH',
    addressPrefix: '0x',
    addressLength: 42,
  },
};

/** Chain IDs in preferred detection order */
export const CHAIN_DETECTION_ORDER: ChainId[] = [1, 8453, 56, 501];

/**
 * Get chain configuration by ID
 */
export function getChainConfig(chainId: ChainId): ChainConfig {
  return CHAIN_CONFIG[chainId];
}

/**
 * Get chain name by ID
 */
export function getChainName(chainId: ChainId | number): string {
  const config = CHAIN_CONFIG[chainId as ChainId];
  return config?.name ?? 'Unknown';
}

/**
 * Check if address format matches Ethereum-like chains (0x prefix)
 */
export function isEVMAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if address format matches Solana (Base58, 32-44 chars)
 */
export function isSolanaAddress(address: string): boolean {
  // Solana addresses are Base58 encoded, typically 32-44 characters
  // No 0x prefix, alphanumeric only (no 0, O, I, l in Base58)
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Validate token address format
 */
export function isValidTokenAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return isEVMAddress(address) || isSolanaAddress(address);
}

/**
 * Detect likely chain from address format
 * Returns null if can't determine, caller should try multiple chains
 */
export function detectChainFromAddress(address: string): ChainId | null {
  if (isEVMAddress(address)) {
    // Could be ETH, BSC, or Base - default to ETH, will verify with API
    return 1;
  }
  if (isSolanaAddress(address)) {
    return 501;
  }
  return null;
}

/**
 * Build API URL for holder intelligence endpoint
 */
export function buildClusterApiUrl(
  tokenAddress: string,
  chainId: ChainId
): string {
  const baseUrl = 'https://web3.okx.com/priapi/v1/holder-intelligence/cluster/info';
  const params = new URLSearchParams({
    chainId: chainId.toString(),
    chainIndex: chainId.toString(),
    tokenAddress,
    t: Date.now().toString(),
  });
  return `${baseUrl}?${params}`;
}

/**
 * Build API URL for token info endpoint
 */
export function buildTokenInfoApiUrl(
  tokenAddress: string,
  chainId: ChainId
): string {
  const baseUrl = 'https://web3.okx.com/priapi/v1/dx/market/v2/latest/info';
  const params = new URLSearchParams({
    tokenContractAddress: tokenAddress,
    chainId: chainId.toString(),
    t: Date.now().toString(),
  });
  return `${baseUrl}?${params}`;
}

/**
 * Build request body for P2P transaction endpoint
 */
export function buildP2PRequestBody(
  addresses: string[],
  chainId: ChainId,
  startTime: number,
  endTime: number = Date.now(),
  limit: number = 100
): {
  url: string;
  body: string;
} {
  const url = 'https://web3.okx.com/priapi/v1/wallet/tx/order/list';
  const body = JSON.stringify({
    addressList: addresses,
    chainId,
    startTime,
    endTime,
    limit,
    lastRowId: '',
    hideValuelessNft: true,
  });
  return { url, body };
}

/**
 * Get blockchain explorer URL for address
 */
export function getExplorerAddressUrl(
  address: string,
  chainId: ChainId
): string {
  const explorers: Record<ChainId, string> = {
    1: `https://etherscan.io/address/${address}`,
    56: `https://bscscan.com/address/${address}`,
    501: `https://solscan.io/account/${address}`,
    8453: `https://basescan.org/address/${address}`,
  };
  return explorers[chainId] ?? '#';
}

/**
 * Get blockchain explorer URL for transaction
 */
export function getExplorerTxUrl(txHash: string, chainId: ChainId): string {
  const explorers: Record<ChainId, string> = {
    1: `https://etherscan.io/tx/${txHash}`,
    56: `https://bscscan.com/tx/${txHash}`,
    501: `https://solscan.io/tx/${txHash}`,
    8453: `https://basescan.org/tx/${txHash}`,
  };
  return explorers[chainId] ?? '#';
}

/**
 * Get chain logo URL (from OKX CDN)
 */
export function getChainLogoUrl(chainId: ChainId): string {
  const logos: Record<ChainId, string> = {
    1: 'https://static.coinall.ltd/cdn/wallet/logo/ETH-20220328.png',
    56: 'https://static.coinall.ltd/cdn/wallet/logo/bnb_5000_new.png',
    501: 'https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png',
    8453: 'https://static.coinall.ltd/cdn/wallet/logo/base_20800_new.png',
  };
  return logos[chainId] ?? '';
}
