'use client'

import React, { useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCopy,
  faCheck,
  faArrowUpRightFromSquare,
  faBuildingColumns,
  faFileLines,
  faMicrophoneLines,
  faWallet,
  faEye,
  faEyeSlash,
  faCrosshairs,
} from '@fortawesome/free-solid-svg-icons'
import type { ChainId } from '@/types/api'
import { matchNameToIcon } from '@/lib/constants'
import { 
  WalletWithCluster, 
  getExchangeInfo, 
  getKolInfo, 
  getWalletLabel, 
  deduplicateTags 
} from '@/utils/walletUtils'
import { formatPercent, formatValue, truncateAddress, formatRelativeTime, flattenTags } from '@/utils/formatters'
import { getAddressExplorerUrl } from '@/utils/chainMapping'

export interface WalletRowProps {
  wallet: WalletWithCluster
  onClick?: () => void
  chainId?: ChainId
  isHidden?: boolean
  isHighlighted?: boolean
  onHide?: (hidden: boolean) => void
  onHighlight?: (highlighted: boolean) => void
}

/** Wallet Row Component with swipe gestures */
export default function WalletRow({ 
  wallet, 
  onClick, 
  chainId = 1,
  isHidden = false,
  isHighlighted = false,
  onHide,
  onHighlight
}: WalletRowProps) {
  const [copied, setCopied] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  
  const pnlPct = parseFloat(wallet.tokenPnlPct || '0')
  const pnlValue = parseFloat(wallet.tokenPnl || '0')
  const pnlColor = pnlPct >= 0 ? 'text-green-400' : 'text-red-400'
  const tags = flattenTags(wallet.tagList)
  const { icons, textTags } = deduplicateTags(tags, wallet)
  
  const { isExchange, info: exchangeInfo } = getExchangeInfo(wallet.exchange)
  const kolInfo = getKolInfo(wallet)
  
  // Get wallet label from exchange name, KOL name, or meaningful tag
  let walletLabel = getWalletLabel(wallet)
  // Prefer KOL name if available
  if (kolInfo.isKol && kolInfo.name) {
    walletLabel = kolInfo.name
  }
  
  // Check for name-based icon (for wallets with labels like "Uniswap", "Binance", etc.)
  const nameIconPath = matchNameToIcon(walletLabel || exchangeInfo?.name)
  
  // Check if this is a real cluster (more than 1 wallet in the cluster)
  const isRealCluster = (wallet.clusterSize || 0) > 1
  
  // Cluster color for outline - only show for real clusters
  const clusterColor = isRealCluster 
    ? `hsl(${(wallet.clusterRank * 137.508) % 360}, 70%, 50%)` 
    : 'transparent'
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleExplorer = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(getAddressExplorerUrl(wallet.address, chainId), '_blank')
  }
  
  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    setIsDragging(true)
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
    
    // Only swipe horizontally if not scrolling vertically
    if (deltaY > 30) {
      touchStartRef.current = null
      setSwipeX(0)
      setIsDragging(false)
      return
    }
    
    // Limit swipe range
    const clampedX = Math.max(-80, Math.min(80, deltaX))
    setSwipeX(clampedX)
  }
  
  const handleTouchEnd = () => {
    if (!touchStartRef.current) return
    
    const duration = Date.now() - touchStartRef.current.time
    const isQuickSwipe = duration < 300 && Math.abs(swipeX) > 30
    
    if (swipeX < -40 || (isQuickSwipe && swipeX < 0)) {
      // Swipe left - toggle hide
      onHide?.(!isHidden)
    } else if (swipeX > 40 || (isQuickSwipe && swipeX > 0)) {
      // Swipe right - toggle highlight
      onHighlight?.(!isHighlighted)
    }
    
    touchStartRef.current = null
    setSwipeX(0)
    setIsDragging(false)
  }
  
  const handleClick = () => {
    // Only trigger click if not swiping
    if (Math.abs(swipeX) < 10 && !isDragging) {
      onClick?.()
    }
  }
  
  // State for image loading errors
  const [kolImageError, setKolImageError] = useState(false)
  const [exchangeImageError, setExchangeImageError] = useState(false)
  
  // Determine which icon/image to show (priority: KOL image > name icon > exchange logo > fallback icons)
  const renderWalletIcon = () => {
    const iconSize = "w-6 h-6" // Slightly bigger for named wallets
    const fallbackSize = "w-5 h-5"
    
    // Priority 1: KOL image (highest priority for KOLs) - only if URL looks valid
    if (kolInfo.isKol && kolInfo.image && !kolImageError) {
      // Check if the URL looks like a valid image URL
      const isValidImageUrl = kolInfo.image.startsWith('http') && 
        (kolInfo.image.includes('.jpg') || kolInfo.image.includes('.jpeg') || 
         kolInfo.image.includes('.png') || kolInfo.image.includes('.gif') || 
         kolInfo.image.includes('.webp') || kolInfo.image.includes('.svg') ||
         kolInfo.image.includes('pbs.twimg.com') || kolInfo.image.includes('static.okx.com'))
      
      if (isValidImageUrl) {
        return (
          <img 
            src={kolInfo.image} 
            alt={kolInfo.name || 'KOL'} 
            className={`${iconSize} rounded-full object-cover`} 
            title={kolInfo.name}
            onError={() => setKolImageError(true)}
          />
        )
      }
    }
    
    // Priority 2: Name-based SVG icon
    if (nameIconPath) {
      return (
        <img 
          src={nameIconPath} 
          alt={walletLabel || 'Wallet'} 
          className={`${iconSize} object-contain`} 
          title={walletLabel || undefined} 
        />
      )
    }
    
    // Priority 3: Exchange logo from API
    if (isExchange && exchangeInfo?.logoUrl && !exchangeImageError) {
      return (
        <img 
          src={exchangeInfo.logoUrl} 
          alt={exchangeInfo.name || 'Exchange'} 
          className={`${iconSize} rounded-full`} 
          title={exchangeInfo.name}
          onError={() => setExchangeImageError(true)}
        />
      )
    }
    
    // Priority 4: Fallback icons
    if (kolInfo.isKol) {
      return <FontAwesomeIcon icon={faMicrophoneLines} className={`${fallbackSize} text-slate-400`} title="KOL" />
    }
    if (isExchange) {
      return <FontAwesomeIcon icon={faBuildingColumns} className={`${fallbackSize} text-slate-400`} title="Exchange" />
    }
    if (wallet.contract) {
      return <FontAwesomeIcon icon={faFileLines} className={`${fallbackSize} text-slate-400`} title="Contract" />
    }
    
    return <FontAwesomeIcon icon={faWallet} className={`${fallbackSize} ${clusterColor}`} />
  }
  
  return (
    <div 
      ref={rowRef}
      className="relative overflow-hidden rounded-lg"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe action indicators */}
      <div className="absolute inset-0 flex items-stretch pointer-events-none">
        {/* Left action (hide) */}
        <div 
          className={`flex z-10 items-center justify-center px-4 transition-opacity ${
            swipeX < -20 ? 'opacity-100' : 'opacity-0'
          } ${isHidden ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: Math.max(0, -swipeX) }}
        >
          <FontAwesomeIcon 
            icon={isHidden ? faEye : faEyeSlash} 
            className={`w-4 h-4 ${isHidden ? 'text-white' : 'text-white'}`} 
          />
        </div>
        <div className="flex-1" />
        {/* Right action (highlight) */}
        <div 
          className={`flex z-10 items-center justify-center px-4 transition-opacity ${
            swipeX > 20 ? 'opacity-100' : 'opacity-0'
          } ${isHighlighted ? 'bg-slate-500' : 'bg-yellow-500'}`}
          style={{ width: Math.max(0, swipeX) }}
        >
          <FontAwesomeIcon 
            icon={faCrosshairs} 
            className={`w-4 h-4 ${isHighlighted ? 'text-white' : 'text-white'}`} 
          />
        </div>
      </div>
      
      {/* Main row content */}
      <button
        onClick={handleClick}
        className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/50 transition-all text-left ${
          isRealCluster ? 'bg-slate-800/50' : 'bg-slate-800/30'
        } ${isHidden ? 'opacity-40' : ''} ${isHighlighted ? 'ring-2 ring-yellow-400/50' : ''}`}
        style={{ 
          transform: `translateX(${swipeX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          ...(isRealCluster ? { 
            border: `1px solid ${clusterColor}`,
            borderLeftWidth: '3px',
            boxShadow: `0 0 8px ${clusterColor}40`
          } : {})
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Type icon or exchange/KOL image - now larger */}
          <div className={`flex-shrink-0 p-1 w-8 h-8 flex items-center justify-center`} >
            {renderWalletIcon()}
          </div>
          
          <div className="min-w-0 flex-1">
            {/* Label or Address row */}
            <div className="flex items-center gap-1.5">
              {walletLabel ? (
                // Show name only when we have a label
                <span className="text-xs font-medium text-white truncate max-w-[140px]" title={walletLabel}>
                  {walletLabel}
                </span>
              ) : (
                // Show address when no label
                <span className="font-mono text-xs text-slate-300 truncate">{truncateAddress(wallet.address)}</span>
              )}
              
              {/* Copy & Explorer icons - always use full address */}
              <button 
                onClick={handleCopy}
                className="mb-1 hover:bg-slate-600 rounded transition-colors flex-shrink-0"
                title={copied ? 'Copied!' : `Copy: ${wallet.address}`}
              >
                <FontAwesomeIcon 
                  icon={copied ? faCheck : faCopy} 
                  className={`w-2.5 h-2.5 ${copied ? 'text-green-400' : 'text-slate-300 hover:text-slate-200'}`} 
                />
              </button>
              <button 
                onClick={handleExplorer}
                className="mb-1 hover:bg-slate-600 rounded transition-colors flex-shrink-0"
                title="View on explorer"
              >
                <FontAwesomeIcon 
                  icon={faArrowUpRightFromSquare} 
                  className="w-2.5 h-2.5 text-slate-300 hover:text-slate-200" 
                />
              </button>
              
              {/* Hidden/Highlighted indicators */}
              {isHidden && (
                <FontAwesomeIcon icon={faEyeSlash} className="w-2.5 h-2.5 text-red-400/60" title="Hidden" />
              )}
              {isHighlighted && (
                <FontAwesomeIcon icon={faCrosshairs} className="w-2.5 h-2.5 text-yellow-400" title="Highlighted" />
              )}
            </div>
            
            {/* Tags row */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              {/* Tag icons */}
              {icons}
              
              {/* Text tags */}
              {textTags.map(tag => (
                <span key={tag} className="bg-slate-700 px-1 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              
              <span className="text-slate-500">{formatRelativeTime(wallet.lastActive)}</span>
            </div>
          </div>
        </div>
        
        <div className="text-right flex-shrink-0 ml-2">
          <div className="text-xs font-medium mb-2">{formatPercent(wallet.holdingPct)}<span className="text-slate-500 ml-1">({formatValue(wallet.holdingValue)})</span></div>
          <div className={`text-[10px] ${pnlColor}`}>
            {pnlPct >= 0 ? '+' : ''}{(pnlPct * 100).toFixed(1)}% 
            <span className="text-slate-500 ml-1">({formatValue(Math.abs(pnlValue))})</span>
          </div>
        </div>
      </button>
    </div>
  )
}
