'use client'

import type { ChainId, ClusterResponse, TokenInfoResponse } from '@/types/api'
import { CHAIN_OPTIONS } from '@/lib/constants'
import { formatAmount, formatValue, formatPrice } from '@/utils/formatters'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faCrosshairs,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'

interface TokenDetailModalProps {
  tokenInfo: TokenInfoResponse
  chainId: ChainId
  clusterData?: ClusterResponse
  onClose: () => void
}

export default function TokenDetailModal({ 
  tokenInfo,
  chainId,
  clusterData,
  onClose 
}: TokenDetailModalProps) {
  const data = tokenInfo.data
  if (!data) return null
  
  // Parse numeric values
  const price = parseFloat(data.price || '0')
  const marketCap = parseFloat(data.marketCap || '0')
  const volume = parseFloat(data.volume || '0')
  const liquidity = parseFloat(data.liquidity || '0')
  const holders = parseFloat(data.holders || '0')
  
  // Price changes
  const change5M = parseFloat(data.change5M || '0')
  const change1H = parseFloat(data.change1H || '0')
  const change4H = parseFloat(data.change4H || '0')
  const change24H = parseFloat(data.change || '0')
  
  // Risk metrics
  const bundleRatio = parseFloat(data.bundleHoldingRatio || '0')
  const devRatio = parseFloat(data.devHoldingRatio || '0')
  const top10Pct = parseFloat(data.top10HoldAmountPercentage || '0')
  const riskLevel = data.riskLevel || 'unknown'
  
  // Sniper info
  const snipersTotal = parseInt(data.snipersTotal || '0')
  const snipersClear = parseInt(data.snipersClear || '0')
  const snipersRemaining = snipersTotal - snipersClear
  
  // Trade activity
  const tradeNum = parseInt(data.tradeNum || '0')
  const transactionNum = parseInt(data.transactionNum || '0')
  
  // Cluster data metrics - these are text labels like "High", "Medium", "Low", or "--"
  const rugpullRisk = clusterData?.data?.rugpullProbability || 'Unknown'
  const clusterConcentrationLevel = clusterData?.data?.clusterConcentration || 'Unknown'
  const freshWalletsLevel = clusterData?.data?.freshWallets || '0'
  
  // Helper to convert risk level text to numeric value for progress bars
  const riskLevelToPercent = (level: string): number => {
    switch (level.toLowerCase()) {
      case 'high': return 80
      case 'medium': return 50
      case 'low': return 20
      default: return 0
    }
  }
  
  const getChangeColor = (val: number) => val >= 0 ? 'text-green-400' : 'text-red-400'
  const getChangeBg = (val: number) => val >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
  
  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'text-red-400 bg-red-500/20'
      case 'medium': return 'text-amber-400 bg-amber-500/20'
      case 'low': return 'text-green-400 bg-green-500/20'
      default: return 'text-slate-400 bg-slate-500/20'
    }
  }
  
  const getRiskTextColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-amber-400'
      case 'low': return 'text-green-400'
      default: return 'text-slate-400'
    }
  }
  
  const getRiskBarColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-amber-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-slate-500'
    }
  }
  
  const chainConfig = CHAIN_OPTIONS.find(c => c.id === chainId) ?? CHAIN_OPTIONS[0]
  
  return (
    <>
      {/* Desktop: Centered Popup Modal */}
      <div 
        className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <div 
          className="bg-slate-950 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-5 border-b border-slate-700/50 bg-gradient-to-r from-slate-900 to-slate-950">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {data.tokenLogoUrl ? (
                    <img 
                      src={data.tokenLogoUrl} 
                      alt={data.tokenName}
                      className="w-14 h-14 rounded-xl border border-slate-600"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-xl font-bold">
                      {(data.tokenSymbol || '?')[0]}
                    </div>
                  )}
                  <img 
                    src={chainConfig.logo}
                    alt={chainConfig.name}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-950"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{data.tokenName}</h3>
                    <span className="text-sm text-slate-400">${data.tokenSymbol}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskColor(riskLevel)}`}>
                      {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xl font-bold text-white">{formatPrice(price)}</span>
                    <span className={`text-sm font-medium ${getChangeColor(change24H)}`}>
                      {change24H >= 0 ? '+' : ''}{formatAmount(change24H)}%
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
            {/* Price Changes Grid */}
            <div>
              <h4 className="text-sm font-semibold text-slate-400 mb-3">Price Changes</h4>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: '5M', value: change5M },
                  { label: '1H', value: change1H },
                  { label: '4H', value: change4H },
                  { label: '24H', value: change24H },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl p-3 border text-center ${getChangeBg(item.value)}`}>
                    <div className="text-xs text-slate-400 mb-1">{item.label}</div>
                    <div className={`text-lg font-bold ${getChangeColor(item.value)}`}>
                      {item.value >= 0 ? '+' : ''}{formatAmount(item.value)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Market Stats */}
            <div>
              <h4 className="text-sm font-semibold text-slate-400 mb-3">Market Statistics</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="text-xs text-slate-400 mb-1">Market Cap</div>
                  <div className="text-lg font-bold text-white">{formatValue(marketCap)}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="text-xs text-slate-400 mb-1">24H Volume</div>
                  <div className="text-lg font-bold text-white">{formatValue(volume)}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="text-xs text-slate-400 mb-1">Liquidity</div>
                  <div className="text-lg font-bold text-white">{formatValue(liquidity)}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="text-xs text-slate-400 mb-1">Holders</div>
                  <div className="text-lg font-bold text-white">{(parseFloat(formatAmount(holders))).toFixed(0)}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="text-xs text-slate-400 mb-1">Trades (24H)</div>
                  <div className="text-lg font-bold text-white">{formatAmount(tradeNum)}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="text-xs text-slate-400 mb-1">Transactions</div>
                  <div className="text-lg font-bold text-white">{formatAmount(transactionNum)}</div>
                </div>
              </div>
            </div>
            
            {/* Risk Indicators */}
            <div>
              <h4 className="text-sm font-semibold text-slate-400 mb-3">Risk Indicators</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Top 10 Holders</span>
                    <span className="text-sm font-bold text-white">{(top10Pct).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${top10Pct > 0.5 ? 'bg-red-500' : top10Pct > 0.3 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(top10Pct, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Cluster Concentration</span>
                    <span className={`text-sm font-bold ${getRiskTextColor(clusterConcentrationLevel)}`}>
                      {clusterConcentrationLevel}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getRiskBarColor(clusterConcentrationLevel)}`}
                      style={{ width: `${riskLevelToPercent(clusterConcentrationLevel)}%` }}
                    />
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCrosshairs} className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-slate-400">Snipers</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-white">{snipersRemaining}</span>
                    <span className="text-lg text-slate-500">/ {snipersTotal}</span>
                    {/* TODO: Add sum of sniper holding supply share */}
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faTriangleExclamation} className={`w-4 h-4 ${getRiskTextColor(rugpullRisk)}`} />
                    <span className="text-xs text-slate-400">Rugpull Risk</span>
                  </div>
                  <div className="text-lg font-bold mt-1">
                    <span className={getRiskTextColor(rugpullRisk)}>
                      {rugpullRisk}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Holder Type Distribution */}
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
                  <div className="text-xs text-slate-400 mb-1">Bundle Holding</div>
                  <div className={`text-sm font-bold ${bundleRatio > 0.1 ? 'text-red-400' : 'text-slate-300'}`}>
                    {bundleRatio.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
                  <div className="text-xs text-slate-400 mb-1">Dev Holding</div>
                  <div className={`text-sm font-bold ${devRatio > 0.1 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {(devRatio * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
                  <div className="text-xs text-slate-400 mb-1">Fresh Holding</div>
                  <div className={`text-sm font-bold ${getRiskTextColor(freshWalletsLevel)}`}>
                    {((parseFloat(freshWalletsLevel)) * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile: Bottom Sheet */}
      <div className="md:hidden fixed inset-0 z-50">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        
        {/* Bottom Sheet */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-950 rounded-t-3xl border-t border-slate-700 max-h-[85vh] overflow-hidden animate-slide-up">
          {/* Handle */}
          <div className="flex justify-center p-3">
            <div className="w-10 h-1 bg-slate-600 rounded-full" />
          </div>
          
          {/* Header */}
          <div className="px-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                {data.tokenLogoUrl ? (
                  <img 
                    src={data.tokenLogoUrl} 
                    alt={data.tokenName}
                    className="w-12 h-12 rounded-xl border border-slate-600"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-lg font-bold">
                    {(data.tokenSymbol || '?')[0]}
                  </div>
                )}
                <img 
                  src={chainConfig.logo}
                  alt={chainConfig.name}
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{data.tokenName}</span>
                  <span className="text-xs text-slate-400">${data.tokenSymbol}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{formatPrice(price)}</span>
                  <span className={`text-sm ${getChangeColor(change24H)}`}>
                    {change24H >= 0 ? '+' : ''}{formatAmount(change24H)}%
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="px-3 py-2 bg-slate-800 rounded-full">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-4 space-y-4 overflow-y-auto max-h-[65vh]">
            {/* Price Changes */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '5M', value: change5M },
                { label: '1H', value: change1H },
                { label: '4H', value: change4H },
                { label: '24H', value: change24H },
              ].map((item) => (
                <div key={item.label} className={`rounded-lg p-2 border text-center ${getChangeBg(item.value)}`}>
                  <div className="text-[10px] text-slate-400">{item.label}</div>
                  <div className={`text-sm font-bold ${getChangeColor(item.value)}`}>
                    {item.value >= 0 ? '+' : ''}{(item.value).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
            
            {/* Market Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                <div className="text-[10px] text-slate-400">Market Cap</div>
                <div className="text-sm font-bold text-white">{formatValue(marketCap)}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                <div className="text-[10px] text-slate-400">24H Volume</div>
                <div className="text-sm font-bold text-white">{formatValue(volume)}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                <div className="text-[10px] text-slate-400">Liquidity</div>
                <div className="text-sm font-bold text-white">{formatValue(liquidity)}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                <div className="text-[10px] text-slate-400">Holders</div>
                <div className="text-sm font-bold text-white">{formatAmount(holders)}</div>
              </div>
            </div>
            
            {/* Risk Bars */}
            <div className="space-y-2">
              <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Top 10 Holders</span>
                  <span className="font-bold text-white">{(top10Pct).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${top10Pct > 0.5 ? 'bg-red-500' : top10Pct > 0.3 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(top10Pct, 100)}%` }}
                  />
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Cluster Concentration</span>
                  <span className={`font-bold ${getRiskTextColor(clusterConcentrationLevel)}`}>{clusterConcentrationLevel}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${getRiskBarColor(clusterConcentrationLevel)}`}
                    style={{ width: `${riskLevelToPercent(clusterConcentrationLevel)}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 text-center">
                <div className="text-[10px] text-slate-400">Snipers</div>
                <div className="text-sm font-bold text-amber-400">{snipersRemaining}/{snipersTotal}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 text-center">
                <div className="text-[10px] text-slate-400">Rugpull Risk</div>
                <div className={`text-sm font-bold ${getRiskTextColor(rugpullRisk)}`}>
                  {rugpullRisk}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 text-center">
                <div className="text-[10px] text-slate-400">Risk Level</div>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getRiskColor(riskLevel)}`}>
                  {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Animation styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
