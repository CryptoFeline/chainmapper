'use client'

import { useState } from 'react'
import type { ChainId } from '@/types/api'
import { WalletWithCluster, getExchangeInfo, getKolInfo, getWalletLabel } from '@/utils/walletUtils'
import { formatValue, formatPrice, formatRelativeTime, truncateAddress } from '@/utils/formatters'
import { getAddressExplorerUrl } from '@/utils/chainMapping'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCopy,
  faArrowUpRightFromSquare,
  faWallet,
  faBuildingColumns,
  faFileLines,
  faMicrophoneLines,
  faXmark,
  faCircleNodes,
  faCheck,
  faClock,
  faChartLine,
  faArrowTrendUp,
  faArrowTrendDown,
} from '@fortawesome/free-solid-svg-icons'

interface WalletDetailModalProps {
  wallet: WalletWithCluster
  chainId: ChainId
  tokenSymbol: string
  priceChange: number
  onClose: () => void
}

export default function WalletDetailModal({ 
  wallet, 
  chainId, 
  tokenSymbol,
  priceChange,
  onClose 
}: WalletDetailModalProps) {
  const [copied, setCopied] = useState(false)
  
  // Parse all numeric values
  const holdingValue = parseFloat(wallet.holdingValue || '0')
  const holdingAmount = parseFloat(wallet.holdingAmount || '0')
  const holdingPct = parseFloat(wallet.holdingPct || '0')
  const pnlPct = parseFloat(wallet.tokenPnlPct || '0')
  const pnlValue = parseFloat(wallet.tokenPnl || '0')
  const boughtValue = parseFloat(wallet.boughtValue || '0')
  const avgCost = parseFloat(wallet.avgCost || '0')
  const soldValue = parseFloat(wallet.soldValue || '0')
  const avgSell = parseFloat(wallet.avgSell || '0')
  const holdingTime = Math.round((wallet.holdingAvgTime || 0))

  const pnlColor = pnlPct >= 0 ? 'text-green-400' : 'text-red-400'
  const pnlBgColor = pnlPct >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
  const { isExchange, info: exchangeInfo } = getExchangeInfo(wallet.exchange)
  const kolInfo = getKolInfo(wallet)
  let walletLabel = getWalletLabel(wallet)
  // Prefer KOL name if available
  if (kolInfo.isKol && kolInfo.name) {
    walletLabel = kolInfo.name
  }
  
  // Check if this is a real cluster (more than 1 wallet in the cluster)
  const isRealCluster = (wallet.clusterSize || 0) > 1
  
  const clusterColor = wallet.clusterRank > 0 
    ? `hsl(${(wallet.clusterRank * 137.508) % 360}, 70%, 50%)` 
    : '#535353ff'
  
  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleExplorer = () => {
    window.open(getAddressExplorerUrl(wallet.address, chainId), '_blank')
  }
  
  // Get wallet type for display
  const getWalletType = () => {
    if (isExchange) return { label: 'Exchange', icon: faBuildingColumns, color: 'text-blue-400' }
    if (wallet.contract) return { label: 'Contract', icon: faFileLines, color: 'text-purple-400' }
    if (wallet.kol) return { label: 'KOL', icon: faMicrophoneLines, color: 'text-yellow-400' }
    return { label: 'Wallet', icon: faWallet, color: 'text-slate-400' }
  }
  const walletType = getWalletType()
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-slate-950 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div 
          className="relative p-5 border-b border-slate-700/50"
          style={{ 
            background: `linear-gradient(135deg, ${clusterColor}15 0%, transparent 50%)`,
            borderLeft: `4px solid ${clusterColor}`
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar/Icon */}
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                  {isExchange && exchangeInfo?.logoUrl ? (
                    <img src={exchangeInfo.logoUrl} alt={exchangeInfo.name || 'Exchange'} className="w-10 h-10 rounded-lg" />
                  ) : kolInfo.isKol && kolInfo.image ? (
                    <img src={kolInfo.image} alt={kolInfo.name || 'KOL'} className="w-10 h-10 rounded-lg" />
                  ) : (
                    <FontAwesomeIcon icon={walletType.icon} className={`w-6 h-6 ${walletType.color}`} />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[9px] font-medium">
                  #{wallet.rank}
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  {walletLabel && (
                    <span className="text-base font-bold text-white">{walletLabel}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${walletType.color} bg-slate-800 border border-slate-700`}>
                    {walletType.label}
                  </span>
                  {kolInfo.isKol && kolInfo.link && (
                    <a 
                      href={kolInfo.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-2.5 h-2.5" />
                      Social
                    </a>
                  )}
                </div>
                <div className="font-mono text-sm text-slate-400 mt-1">{truncateAddress(wallet.address)}</div>
                <div className="flex items-center gap-2 mt-2">
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 hover:bg-slate-700 rounded text-xs transition-colors"
                  >
                    <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={`w-3 h-3 ${copied ? 'text-green-400' : ''}`} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button 
                    onClick={handleExplorer}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 hover:bg-slate-700 rounded text-xs transition-colors"
                  >
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3 h-3" />
                    Explorer
                  </button>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[60vh]">
          
          {/* Main Stats Banner - Stack on mobile */}
          <div className={`rounded-xl p-3 sm:p-4 border ${pnlBgColor}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-[10px] sm:text-xs text-slate-400 mb-0.5">Current Value</div>
                <div className="text-base sm:text-lg font-bold text-white">{formatValue(holdingValue)}</div>
                {/* add token price change 24h */}
                <div className={`text-[10px] ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] sm:text-xs text-slate-400 mb-0.5">Total Return</div>
                <div className={`text-base sm:text-lg font-bold ${pnlColor}`}>
                  {pnlValue >= 0 ? '+' : ''}{formatValue(pnlValue)}
                </div>
                <div className={`text-[10px] ${pnlColor}`}>
                  {pnlPct >= 0 ? '+' : ''}{(pnlPct * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] sm:text-xs text-slate-400 mb-0.5">Token Amount</div>
                <div className="text-base sm:text-lg font-bold text-white">{formatValue(holdingAmount)}</div>
                <div className="text-[10px] text-slate-500">{tokenSymbol}</div>
              </div>
              
              <div className="text-center">
                <div className="text-[10px] sm:text-xs text-slate-400 mb-0.5">Supply Share</div>
                <div className="text-base sm:text-lg font-bold text-white">{(holdingPct * 100).toFixed(2)}%</div>
                <div className="text-[10px] text-slate-500">Rank #{wallet.rank}</div>
              </div>
            </div>
          </div>
          
          {/* Trading Activity - 2x2 grid on mobile */}
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <FontAwesomeIcon icon={faChartLine} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
              <h4 className="text-xs sm:text-sm font-semibold text-white">Trading Activity</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-700/50">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 mb-1 sm:mb-2">
                  <FontAwesomeIcon icon={faArrowTrendUp} className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-400" />
                  Total Bought
                </div>
                <div className="text-sm sm:text-base font-semibold text-white">{formatValue(boughtValue)}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-700/50">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 mb-1 sm:mb-2">
                  <FontAwesomeIcon icon={faArrowTrendDown} className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400" />
                  Total Sold
                </div>
                <div className="text-sm sm:text-base font-semibold text-white">{formatValue(soldValue)}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-700/50">
                <div className="text-[10px] sm:text-xs text-slate-400 mb-1">Avg Buy Price</div>
                <div className="text-sm sm:text-base font-semibold text-white">{formatPrice(avgCost)}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-700/50">
                <div className="text-[10px] sm:text-xs text-slate-400 mb-1">Avg Sell Price</div>
                <div className="text-sm sm:text-base font-semibold text-white">{avgSell > 0 ? formatPrice(avgSell) : '--'}</div>
              </div>
            </div>
          </div>
          
          {/* Timing & Cluster */}
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
              <h4 className="text-xs sm:text-sm font-semibold text-white">Timing & Position</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-700/50">
                <div className="text-[10px] sm:text-xs text-slate-400 mb-1">Holding Time</div>
                <div className="text-sm sm:text-base font-semibold text-white">
                  {formatRelativeTime(holdingTime)}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-700/50">
                <div className="text-[10px] sm:text-xs text-slate-400 mb-1">Last Activity</div>
                <div className="text-sm sm:text-base font-semibold text-white">{formatRelativeTime(wallet.lastActive)}</div>
              </div>
              {isRealCluster && (
                <>
                  <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-700/50">
                    <div className="text-[10px] sm:text-xs text-slate-400 mb-1">Cluster</div>
                    <div className="text-sm sm:text-base font-semibold" style={{ color: clusterColor }}>
                      #{wallet.clusterRank}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-700/50">
                    <div className="text-[10px] sm:text-xs text-slate-400 mb-1">Cluster Size</div>
                    <div className="text-sm sm:text-base font-semibold text-white">{wallet.clusterSize} wallets</div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Cluster Association - only show for real clusters (2+ wallets) */}
          {isRealCluster && (
            <div>
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <FontAwesomeIcon icon={faCircleNodes} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                <h4 className="text-xs sm:text-sm font-semibold text-white">Cluster Association</h4>
              </div>
              <div 
                className="flex items-center gap-2 sm:gap-3 bg-slate-800/50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-700/50"
                style={{ borderLeftWidth: '3px', borderLeftColor: clusterColor }}
              >
                <FontAwesomeIcon icon={faCircleNodes} className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: clusterColor }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-white">Cluster #{wallet.clusterRank}</div>
                  <div className="text-[10px] sm:text-xs text-slate-400 truncate">Part of a connected wallet cluster</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] sm:text-xs text-slate-400">Cluster Rank</div>
                  <div className="text-xs sm:text-sm font-bold" style={{ color: clusterColor }}>#{wallet.clusterRank}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
