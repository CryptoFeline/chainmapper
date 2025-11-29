/**
 * Wallet-related utility functions and types
 * Used by WalletRow, modals, and tab components
 */

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faRobot,
  faBurger,
  faFish,
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
  faProjectDiagram,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import { formatTag } from '@/utils/formatters'
import { GENERIC_TAG_KEYWORDS } from '@/lib/constants'

// ============================================================================
// TYPES
// ============================================================================

/** Extended wallet type with cluster info - used throughout the app */
export interface WalletWithCluster {
  address: string
  rank: number
  holdingPct: string
  holdingAmount: string
  holdingValue: string
  holdingAvgTime: number
  lastActive: number
  tagList: string[][]
  contract: boolean
  exchange: boolean | { name: string; attr?: string; logoUrl: string }[]
  kol: boolean
  tokenPnl?: string
  tokenPnlPct?: string
  boughtValue?: string
  avgCost?: string
  soldValue?: string
  avgSell?: string
  clusterRank: number
  clusterName: string
  clusterSize: number
}

/** Parsed tag info with optional metadata */
export interface TagInfo {
  tag: string
  name?: string
  attr?: string
  logoUrl?: string
}

/** Exchange info extracted from wallet */
export interface ExchangeInfo {
  isExchange: boolean
  info: { name: string; attr?: string; logoUrl: string } | null
}

/** KOL info extracted from wallet */
export interface KolInfo {
  isKol: boolean
  name?: string
  image?: string
  link?: string
}

// ============================================================================
// TAG PARSING
// ============================================================================

/**
 * Parse tagList array to extract tag info with names
 * Mirrors the BubbleMap logic for consistency
 */
export function parseTagList(tagList: unknown[][]): TagInfo[] {
  const result: TagInfo[] = []
  if (!tagList || !Array.isArray(tagList)) return result
  
  tagList.forEach(tagGroup => {
    if (!Array.isArray(tagGroup)) return
    
    let currentTag: string | null = null
    let currentInfo: { name?: string; attr?: string; logoUrl?: string } = {}
    
    tagGroup.forEach(item => {
      if (typeof item === 'string') {
        // If we had a previous tag, save it
        if (currentTag) {
          result.push({ tag: currentTag, ...currentInfo })
        }
        // Start new tag
        currentTag = item
        currentInfo = {}
      } else if (item && typeof item === 'object') {
        // This is the data object for the current tag
        const obj = item as { name?: string; attr?: string; logoUrl?: string }
        currentInfo = {
          name: obj.name,
          attr: obj.attr,
          logoUrl: obj.logoUrl
        }
      }
    })
    
    // Don't forget the last tag in the group
    if (currentTag) {
      result.push({ tag: currentTag, ...currentInfo })
    }
  })
  
  return result
}

// ============================================================================
// WALLET INFO EXTRACTION
// ============================================================================

/**
 * Safely extract exchange info from wallet.exchange field
 * Handles multiple API response formats
 */
export function getExchangeInfo(exchange: unknown): ExchangeInfo {
  // Handle array of exchange objects
  if (Array.isArray(exchange) && exchange.length > 0) {
    const first = exchange[0]
    if (first && typeof first === 'object') {
      const obj = first as { name?: string; attr?: string; logoUrl?: string }
      const displayName = String(obj.name || obj.attr || '')
      return { 
        isExchange: true, 
        info: { name: displayName, attr: obj.attr ? String(obj.attr) : undefined, logoUrl: String(obj.logoUrl || '') }
      }
    }
    return { isExchange: true, info: null }
  }
  
  // Handle single exchange object
  if (exchange && typeof exchange === 'object' && ('name' in exchange || 'attr' in exchange)) {
    const obj = exchange as { name?: string; attr?: string; logoUrl?: string }
    const displayName = String(obj.name || obj.attr || '')
    return { 
      isExchange: true, 
      info: { name: displayName, attr: obj.attr ? String(obj.attr) : undefined, logoUrl: String(obj.logoUrl || '') }
    }
  }
  
  // Handle boolean
  if (typeof exchange === 'boolean') {
    return { isExchange: exchange, info: null }
  }
  
  return { isExchange: false, info: null }
}

/**
 * Extract KOL info from wallet's tagList
 * Looks for 'kol' tag with associated metadata
 */
export function getKolInfo(wallet: { kol: boolean; tagList?: string[][] }): KolInfo {
  if (!wallet.kol && !wallet.tagList) return { isKol: false }
  
  // Search through tagList for kol tag with data
  if (wallet.tagList && Array.isArray(wallet.tagList)) {
    for (const tagGroup of wallet.tagList) {
      if (!Array.isArray(tagGroup)) continue
      
      let foundKolTag = false
      for (const item of tagGroup) {
        if (typeof item === 'string' && item.toLowerCase() === 'kol') {
          foundKolTag = true
        } else if (foundKolTag && item && typeof item === 'object') {
          const obj = item as { 
            name?: string
            displayName?: string
            kolTwitterImage?: string
            image?: string
            link?: string
          }
          const name = obj.name || obj.displayName
          let image = obj.kolTwitterImage || obj.image
          // Prepend base URL if needed
          if (image && !image.startsWith('http')) {
            image = `https://static.okx.com${image}`
          }
          return {
            isKol: true,
            name,
            image,
            link: obj.link
          }
        }
      }
      if (foundKolTag) {
        return { isKol: true }
      }
    }
  }
  
  return { isKol: wallet.kol === true }
}

/**
 * Get wallet display label from exchange name, KOL name, or meaningful tags
 * Returns null if no suitable label found
 */
export function getWalletLabel(wallet: WalletWithCluster): string | null {
  // Priority 1: Exchange name or attr from wallet.exchange
  const { info: exchangeInfo, isExchange } = getExchangeInfo(wallet.exchange)
  if (isExchange && exchangeInfo?.name) {
    return exchangeInfo.name
  }
  
  // Priority 2: Parse tagList for tags with name data
  const tagInfos = parseTagList(wallet.tagList)
  
  // Check for exchange tag with name
  const exchangeTag = tagInfos.find(t => t.tag.toLowerCase() === 'exchange')
  if (exchangeTag?.name) {
    return exchangeTag.name
  }
  
  // Check for liquidityPool with name
  const lpTag = tagInfos.find(t => t.tag.toLowerCase() === 'liquiditypool')
  if (lpTag?.name) {
    return lpTag.name
  }
  
  // Check other tags for names (excluding generic tag types)
  for (const t of tagInfos) {
    if (t.name) {
      const lowerTag = t.tag.toLowerCase()
      // Skip if the tag itself is a generic type
      if (GENERIC_TAG_KEYWORDS.some(g => lowerTag.includes(g))) continue
      return t.name
    }
  }
  
  return null
}

// ============================================================================
// TAG ICONS & DEDUPLICATION
// ============================================================================

/** Result of tag deduplication */
export interface DeduplicatedTags {
  icons: React.ReactNode[]
  textTags: string[]
}

/**
 * Deduplicate and normalize tags, returning icons and text tags
 * This centralizes the tag→icon mapping logic
 */
export function deduplicateTags(tags: string[], wallet: WalletWithCluster): DeduplicatedTags {
  const icons: React.ReactNode[] = []
  const textTags: string[] = []
  const seenTypes = new Set<string>()
  
  // Check if exchange/contract/kol - these take precedence
  const { isExchange } = getExchangeInfo(wallet.exchange)
  if (isExchange) seenTypes.add('exchange')
  if (wallet.contract) seenTypes.add('contract')
  if (wallet.kol) seenTypes.add('kol')
  
  tags.forEach(tag => {
    // Skip non-string tags
    if (typeof tag !== 'string') return
    
    const lowerTag = tag.toLowerCase()
    
    // Skip if already shown via icon type
    if (lowerTag.includes('exchange') && seenTypes.has('exchange')) return
    if (lowerTag.includes('contract') && seenTypes.has('contract')) return
    if (lowerTag.includes('kol') && seenTypes.has('kol')) return
    
    // MEV Bot Sandwich (highest priority)
    if (lowerTag.includes('mevbot_sandwich') && !seenTypes.has('mevbot_sandwich')) {
      icons.push(<FontAwesomeIcon key="sandwich" icon={faBurger} className="w-3 h-3" style={{ color: '#ca3f64' }} title="Sandwich Bot" />)
      seenTypes.add('mevbot_sandwich')
      seenTypes.add('mevbot')
      return
    }
    
    // MEV Bot
    if (lowerTag.includes('mevbot') && !seenTypes.has('mevbot')) {
      icons.push(<FontAwesomeIcon key="mevbot" icon={faRobot} className="w-3 h-3" style={{ color: '#ca3f64' }} title="MEV Bot" />)
      seenTypes.add('mevbot')
      return
    }
    
    // Phishing
    if ((lowerTag.includes('phishing') || lowerTag.includes('suspectedphishing')) && !seenTypes.has('phishing')) {
      icons.push(<FontAwesomeIcon key="phishing" icon={faFish} className="w-3 h-3" style={{ color: '#ca3f64' }} title="Phishing" />)
      seenTypes.add('phishing')
      return
    }

    // Suspicious
    if (lowerTag.includes('suspicious') && !seenTypes.has('suspicious')) {
      icons.push(<FontAwesomeIcon key="suspicious" icon={faTriangleExclamation} className="w-3 h-3" style={{ color: '#ca3f64' }} title="Suspicious" />)
      seenTypes.add('suspicious')
      return
    }

    // Authority
    if (lowerTag.includes('authority') && !seenTypes.has('authority')) {
      icons.push(<FontAwesomeIcon key="authority" icon={faGavel} className="w-3 h-3 text-slate-400" title="Authority" />)
      seenTypes.add('authority')
      return
    }

    // Protocol
    if (lowerTag.includes('protocol') && !seenTypes.has('protocol')) {
      icons.push(<FontAwesomeIcon key="protocol" icon={faProjectDiagram} className="w-3 h-3 text-slate-400" title="Protocol" />)
      seenTypes.add('protocol')
      return
    }
    
    // Trading Bot
    if (lowerTag.includes('tradingbot') && !seenTypes.has('tradingbot')) {
      icons.push(<FontAwesomeIcon key="tradingbot" icon={faRobot} className="w-3 h-3" style={{ color: '#ca3f64' }} title="Trading Bot" />)
      seenTypes.add('tradingbot')
      return
    }

    // Trading Bot User
    if (lowerTag.includes('trading bot user') && !seenTypes.has('trading bot user')) {
      icons.push(<FontAwesomeIcon key="tradingbotuser" icon={faRobot} className="w-3 h-3" style={{ color: '#ca3f64' }} title="Trading Bot User" />)
      seenTypes.add('trading bot user')
      return
    }
    
    // Bundler
    if (lowerTag.includes('bundle') && !seenTypes.has('bundle')) {
      icons.push(<FontAwesomeIcon key="bundle" icon={faLayerGroup} className="w-3 h-3 text-amber-400" title="Bundler" />)
      seenTypes.add('bundle')
      return
    }
    
    // Sniper
    if (lowerTag.includes('sniper') && !seenTypes.has('sniper')) {
      icons.push(<FontAwesomeIcon key="sniper" icon={faCrosshairs} className="w-3 h-3 text-amber-400" title="Sniper" />)
      seenTypes.add('sniper')
      return
    }
    
    // Insider
    if (lowerTag.includes('insider') && !seenTypes.has('insider')) {
      icons.push(<FontAwesomeIcon key="insider" icon={faClockRotateLeft} className="w-3 h-3 text-slate-400" title="Insider" />)
      seenTypes.add('insider')
      return
    }
    
    // Smart Money
    if (lowerTag.includes('smartmoney') && !seenTypes.has('smartmoney')) {
      icons.push(<FontAwesomeIcon key="smartmoney" icon={faGlasses} className="w-3 h-3 text-slate-400" title="Smart Money" />)
      seenTypes.add('smartmoney')
      return
    }
    
    // Dev
    if (lowerTag === 'dev' && !seenTypes.has('dev')) {
      icons.push(<FontAwesomeIcon key="dev" icon={faCode} className="w-3 h-3 text-slate-400" title="Dev" />)
      seenTypes.add('dev')
      return
    }
    
    // Liquidity Pool
    if (lowerTag.includes('liquiditypool') && !seenTypes.has('liquiditypool')) {
      icons.push(<FontAwesomeIcon key="lp" icon={faDroplet} className="w-3 h-3 text-blue-400" title="Liquidity Pool" />)
      seenTypes.add('liquiditypool')
      return
    }
    
    // Whale
    if (lowerTag.includes('whale') && !seenTypes.has('whale')) {
      icons.push(
        <img 
          key="whale" 
          src="/icon/whale.min.svg" 
          alt="Whale" 
          className="w-3 h-3" 
          title="Whale"
        />
      )
      seenTypes.add('whale')
      return
    }
    
    // Fresh wallet
    if (lowerTag.includes('fresh') && !seenTypes.has('fresh')) {
      icons.push(<FontAwesomeIcon key="fresh" icon={faSeedling} className="w-3 h-3 text-slate-400" title="Fresh Wallet" />)
      seenTypes.add('fresh')
      return
    }
    
    // Top holder
    if (lowerTag.includes('top') && !seenTypes.has('top')) {
      icons.push(<FontAwesomeIcon key="top" icon={faCrown} className="w-3 h-3 text-slate-400" title="Top Holder" />)
      seenTypes.add('top')
      return
    }

    // Paper hands
    if (lowerTag.includes('paper') && !seenTypes.has('paper')) {
      icons.push(<FontAwesomeIcon key="paper" icon={faToiletPaper} className="w-3 h-3 text-slate-400" title="Paper Hands" />)
      seenTypes.add('paper')
      return
    }

    // Diamond hands
    if ((lowerTag.includes('diamond') || lowerTag.includes('diamondhands')) && !seenTypes.has('diamond')) {
      icons.push(<FontAwesomeIcon key="diamond" icon={faGem} className="w-3 h-3 text-primary-400" title="Diamond Hands" />)
      seenTypes.add('diamond')
      return
    }

    // Meme Experts
    if (lowerTag.includes('golddogexpert') && !seenTypes.has('golddogexpert')) {
      icons.push(<FontAwesomeIcon key="golddogexpert" icon={faFaceGrin} className="w-3 h-3 text-slate-400" title="Meme Expert" />)
      seenTypes.add('golddogexpert')
      return
    }
    
    // Other tags as text (limited)
    if (textTags.length < 1 && !seenTypes.has(lowerTag)) {
      textTags.push(formatTag(tag))
      seenTypes.add(lowerTag)
    }
  })
  
  return { icons, textTags }
}
