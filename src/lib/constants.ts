/**
 * Shared constants and configuration for the Crypto Holder Mapping app
 * This file centralizes all configurable constants used across components
 */

import type { ChainId } from '@/types/api'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { 
  faBuildingColumns,
  faFileLines,
  faMicrophoneLines,
  faRobot,
  faBurger,
  faGlasses,
  faCode,
  faCrosshairs,
  faLayerGroup,
  faClockRotateLeft,
  faDroplet,
  faSeedling,
  faCrown,
  faToiletPaper,
  faGem,
  faFaceGrin,
  faGavel,
} from '@fortawesome/free-solid-svg-icons'

// ============================================================================
// CHAIN CONFIGURATION
// ============================================================================

export interface ChainConfig {
  id: ChainId
  name: string
  logo: string
  explorer: string
}

/** Supported blockchain networks with their configuration */
export const CHAIN_OPTIONS: ChainConfig[] = [
  { 
    id: 1, 
    name: 'Ethereum', 
    logo: 'https://static.coinall.ltd/cdn/wallet/logo/ETH-20220328.png', 
    explorer: 'https://etherscan.io/token/' 
  },
  { 
    id: 56, 
    name: 'BSC', 
    logo: 'https://static.coinall.ltd/cdn/wallet/logo/bnb_5000_new.png', 
    explorer: 'https://bscscan.com/token/' 
  },
  { 
    id: 501, 
    name: 'Solana', 
    logo: 'https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png', 
    explorer: 'https://solscan.io/token/' 
  },
  { 
    id: 8453, 
    name: 'Base', 
    logo: 'https://static.coinall.ltd/cdn/wallet/logo/base_20800_new.png', 
    explorer: 'https://basescan.org/token/' 
  },
]

/** Get chain config by ID */
export function getChainConfig(chainId: ChainId): ChainConfig {
  return CHAIN_OPTIONS.find(c => c.id === chainId) ?? CHAIN_OPTIONS[0]
}

// ============================================================================
// NAME-BASED ICONS (for wallets with known names like exchanges, DEXes, etc.)
// ============================================================================

/** 
 * Map of known entity names to their SVG icon paths in /public/icon/
 * Used to show branded icons for recognized exchanges, DEXes, and protocols
 */
export const NAME_ICONS: Record<string, string> = {
  // DEX/Exchange icons
  'uniswap': '/icon/uniswap.svg',
  'pancake': '/icon/pancake.svg',
  'pancakeswap': '/icon/pancake.svg',
  'sushiswap': '/icon/sushi.svg',
  'sushi': '/icon/sushi.svg',
  'raydium': '/icon/raydium.svg',
  'orca': '/icon/orca.svg',
  'jupiter': '/icon/jupiter.svg',
  'meteora': '/icon/meteora.svg',
  'kyberswap': '/icon/kyberswap.svg',
  'kyber': '/icon/kyberswap.svg',
  'balancer': '/icon/balancer.svg',
  'bancor': '/icon/bancor.svg',
  'apeswap': '/icon/apeswap.svg',
  'sunswap': '/icon/sunswap.svg',
  'dedust': '/icon/dedust.svg',
  '0x': '/icon/0x.svg',
  // CEX icons
  'binance': '/icon/binance.svg',
  'bingx': '/icon/bingx.svg',
  'bitmart': '/icon/bitmart.svg',
  'cobo': '/icon/cobo.svg',
  'coinw': '/icon/coinw.svg',
  'okx': '/icon/okx.svg',
  'bitvavo': '/icon/bitvavo.svg',
  'bybit': '/icon/bybit.svg',
  'kraken': '/icon/kraken.svg',
  'kucoin': '/icon/kucoin.svg',
  'gate.io': '/icon/gate.io.svg',
  'mexc': '/icon/mexc.svg',
  'gemini': '/icon/gemini.svg',
  'hitbtc': '/icon/hitbtc.svg',
  'cryptocom': '/icon/cryptocom.svg',
  'crypto.com': '/icon/cryptocom.svg',
  'robinhood': '/icon/robinhood.svg',
  'swissborg': '/icon/swissborg.svg',
  'xt.com': '/icon/xt.com.svg',
  // Platform icons
  'pump': '/icon/pump.svg',
  'pump.fun': '/icon/pump.svg',
  'coinspot': '/icon/coinspot.svg',
  // Other
  'whale': '/icon/whale.min.svg',
  'lock': '/icon/lock.svg',
}

/** Match a name to an available icon path */
export function matchNameToIcon(name: string | undefined): string | undefined {
  if (!name) return undefined
  const nameLower = name.toLowerCase()
  
  // Direct match first
  if (NAME_ICONS[nameLower]) {
    return NAME_ICONS[nameLower]
  }
  
  // Partial match - check if name contains any of the keys
  for (const [key, path] of Object.entries(NAME_ICONS)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return path
    }
  }
  
  return undefined
}

// ============================================================================
// TAG CONFIGURATION
// ============================================================================

export interface TagConfig {
  /** Keywords to match in tag text (lowercase) */
  keywords: string[]
  /** Display label for the tag */
  label: string
  /** FontAwesome icon or SVG path */
  icon: IconDefinition | string
  /** Tailwind color class for the icon */
  color: string
  /** Priority for deduplication (lower = higher priority) */
  priority: number
  /** Whether this is a "generic" tag that shouldn't be used as wallet label */
  isGeneric?: boolean
}

/**
 * Centralized tag configuration map
 * Order matters for deduplication - earlier entries take precedence
 */
export const TAG_CONFIG: Record<string, TagConfig> = {
  // High priority entity types
  exchange: {
    keywords: ['exchange'],
    label: 'Exchange',
    icon: faBuildingColumns,
    color: 'text-blue-400',
    priority: 1,
    isGeneric: true,
  },
  contract: {
    keywords: ['contract'],
    label: 'Contract',
    icon: faFileLines,
    color: 'text-purple-400',
    priority: 2,
    isGeneric: true,
  },
  kol: {
    keywords: ['kol'],
    label: 'KOL',
    icon: faMicrophoneLines,
    color: 'text-yellow-400',
    priority: 3,
    isGeneric: true,
  },
  
  // Bot types
  mevbot: {
    keywords: ['mevbot', 'mev bot'],
    label: 'MEV Bot',
    icon: faRobot,
    color: 'text-orange-400',
    priority: 10,
    isGeneric: true,
  },
  mevbot_sandwich: {
    keywords: ['mevbot_sandwich', 'sandwich'],
    label: 'Sandwich Bot',
    icon: faBurger,
    color: 'text-amber-400',
    priority: 11,
    isGeneric: true,
  },
  tradingbot: {
    keywords: ['tradingbot', 'trading bot'],
    label: 'Trading Bot',
    icon: faRobot,
    color: 'text-cyan-400',
    priority: 12,
    isGeneric: true,
  },
  trading_bot_user: {
    keywords: ['trading bot user'],
    label: 'Trading Bot User',
    icon: faRobot,
    color: 'text-pink-400',
    priority: 13,
    isGeneric: true,
  },
  
  // Special wallet types
  sniper: {
    keywords: ['sniper'],
    label: 'Sniper',
    icon: faCrosshairs,
    color: 'text-amber-400',
    priority: 20,
    isGeneric: true,
  },
  bundler: {
    keywords: ['bundle', 'bundler'],
    label: 'Bundler',
    icon: faLayerGroup,
    color: 'text-amber-400',
    priority: 21,
    isGeneric: true,
  },
  insider: {
    keywords: ['insider'],
    label: 'Insider',
    icon: faClockRotateLeft,
    color: 'text-slate-400',
    priority: 22,
    isGeneric: true,
  },
  dev: {
    keywords: ['dev'],
    label: 'Dev',
    icon: faCode,
    color: 'text-slate-400',
    priority: 23,
    isGeneric: true,
  },
  smartmoney: {
    keywords: ['smartmoney', 'smart money'],
    label: 'Smart Money',
    icon: faGlasses,
    color: 'text-slate-400',
    priority: 24,
    isGeneric: true,
  },
  liquiditypool: {
    keywords: ['liquiditypool', 'liquidity pool', 'lp'],
    label: 'Liquidity Pool',
    icon: faDroplet,
    color: 'text-blue-400',
    priority: 25,
    isGeneric: true,
  },
  phishing: {
    keywords: ['phishing', 'suspectedphishing'],
    label: 'Phishing',
    icon: faGavel,
    color: 'text-red-500',
    priority: 26,
    isGeneric: true,
  },
  
  // Holder behavior types
  whale: {
    keywords: ['whale'],
    label: 'Whale',
    icon: '/icon/whale.min.svg', // SVG path
    color: 'text-slate-400',
    priority: 30,
    isGeneric: true,
  },
  topholder: {
    keywords: ['top', 'topholder', 'top holder'],
    label: 'Top Holder',
    icon: faCrown,
    color: 'text-slate-400',
    priority: 31,
    isGeneric: true,
  },
  fresh: {
    keywords: ['fresh', 'freshwallet'],
    label: 'Fresh Wallet',
    icon: faSeedling,
    color: 'text-slate-400',
    priority: 32,
    isGeneric: true,
  },
  paperhands: {
    keywords: ['paper', 'paperhands', 'paper hands'],
    label: 'Paper Hands',
    icon: faToiletPaper,
    color: 'text-slate-400',
    priority: 33,
    isGeneric: true,
  },
  diamondhands: {
    keywords: ['diamond', 'diamondhands', 'diamond hands'],
    label: 'Diamond Hands',
    icon: faGem,
    color: 'text-primary-400',
    priority: 34,
    isGeneric: true,
  },
  golddogexpert: {
    keywords: ['golddogexpert', 'meme expert'],
    label: 'Meme Expert',
    icon: faFaceGrin,
    color: 'text-slate-400',
    priority: 35,
    isGeneric: true,
  },
}

/** Get list of all generic tag keywords (for filtering wallet labels) */
export const GENERIC_TAG_KEYWORDS: string[] = Object.values(TAG_CONFIG)
  .filter(t => t.isGeneric)
  .flatMap(t => t.keywords)

/**
 * Find matching tag config for a given tag string
 * Returns the first matching config based on keyword matching
 */
export function findTagConfig(tag: string): TagConfig | undefined {
  const tagLower = tag.toLowerCase()
  
  for (const config of Object.values(TAG_CONFIG)) {
    for (const keyword of config.keywords) {
      if (tagLower.includes(keyword) || keyword.includes(tagLower)) {
        return config
      }
    }
  }
  
  return undefined
}

/**
 * Check if a tag is generic (shouldn't be used as wallet label)
 */
export function isGenericTag(tag: string): boolean {
  const tagLower = tag.toLowerCase()
  return GENERIC_TAG_KEYWORDS.some(k => tagLower.includes(k))
}
