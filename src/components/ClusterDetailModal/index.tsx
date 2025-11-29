'use client'

import { useState } from 'react'
import type { ChainId } from '@/types/api'
import { WalletWithCluster, getExchangeInfo, getWalletLabel } from '@/utils/walletUtils'
import { formatValue, formatPrice, truncateAddress, flattenTags } from '@/utils/formatters'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import WalletRow from '@/components/WalletRow'
import {
  faWallet,
  faBuildingColumns,
  faFileLines,
  faMicrophoneLines,
  faLeaf,
  faCrown,
  faXmark,
  faCircleNodes,
  faChartLine,
  faArrowTrendUp,
  faArrowTrendDown,
  faSackDollar,
  faScaleBalanced,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'

interface ClusterData {
  clusterId: number
  rank: number
  clusterName: string
  holdingPct: string
  addressCount: number
  holdingAmount?: string
  holdingValue?: string
  tokenPnl?: string
  tokenPnlPct?: string
  boughtValue?: string
  avgCost?: string
  soldValue?: string
  avgSell?: string
  holdingAvgTime?: string
  lastActive?: number
  children: WalletWithCluster[]
}

interface ClusterDetailModalProps {
  cluster: ClusterData
  chainId: ChainId
  tokenSymbol: string
  onClose: () => void
  onWalletClick: (address: string) => void
}

export default function ClusterDetailModal({ 
  cluster, 
  chainId, 
  tokenSymbol,
  onClose,
  onWalletClick
}: ClusterDetailModalProps) {
  const [activeView, setActiveView] = useState<'overview' | 'wallets'>('overview')
  
  // Parse cluster-level stats
  const holdingPct = parseFloat(cluster.holdingPct || '0')
  const pnlPct = parseFloat(cluster.tokenPnlPct || '0')
  const pnlValue = parseFloat(cluster.tokenPnl || '0')
  const boughtValue = parseFloat(cluster.boughtValue || '0')
  const avgCost = parseFloat(cluster.avgCost || '0')
  const soldValue = parseFloat(cluster.soldValue || '0')
  const avgSell = parseFloat(cluster.avgSell || '0')
  
  const pnlColor = pnlPct >= 0 ? 'text-green-400' : 'text-red-400'
  const pnlBgColor = pnlPct >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
  
  const clusterColor = `hsl(${(cluster.rank * 137.508) % 360}, 70%, 50%)`
  
  // Calculate aggregated stats from children
  const totalValue = cluster.children.reduce((sum, w) => sum + parseFloat(w.holdingValue || '0'), 0)
  const totalAmount = cluster.children.reduce((sum, w) => sum + parseFloat(w.holdingAmount || '0'), 0)
  const walletCount = cluster.children.length
  
  // Categorize wallets
  const exchangeCount = cluster.children.filter(w => getExchangeInfo(w.exchange).isExchange).length
  const contractCount = cluster.children.filter(w => w.contract).length
  const kolCount = cluster.children.filter(w => w.kol).length
  const regularWallets = walletCount - exchangeCount - contractCount - kolCount
  
  // Count tags
  const tagCounts: Record<string, number> = { whale: 0, top: 0, fresh: 0 }
  cluster.children.forEach(w => {
    const tags = flattenTags(w.tagList)
    tags.forEach(tag => {
      if (typeof tag === 'string') {
        const lt = tag.toLowerCase()
        if (lt.includes('whale')) tagCounts.whale++
        if (lt.includes('top')) tagCounts.top++
        if (lt.includes('fresh')) tagCounts.fresh++
      }
    })
  })
  
  // Sort wallets by holding value for top performers
  const topWallets = [...cluster.children]
    .sort((a, b) => parseFloat(b.holdingValue || '0') - parseFloat(a.holdingValue || '0'))
    .slice(0, 3)
  
  // Calculate best/worst performers by PnL
  const walletsByPnl = [...cluster.children]
    .filter(w => w.tokenPnlPct)
    .sort((a, b) => parseFloat(b.tokenPnlPct || '0') - parseFloat(a.tokenPnlPct || '0'))
  const bestPerformer = walletsByPnl[0]
  const worstPerformer = walletsByPnl[walletsByPnl.length - 1]
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div 
          className="relative p-5 border-b border-slate-700/50"
          style={{ 
            background: `linear-gradient(135deg, ${clusterColor}20 0%, transparent 50%)`,
            borderLeft: `4px solid ${clusterColor}`
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                <FontAwesomeIcon icon={faCircleNodes} className="w-8 h-8" style={{ color: clusterColor }} />
              </div>
              <div>
                <div className="text-xl font-bold text-white">Cluster #{cluster.rank}</div>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faUsers} className="w-3 h-3" />
                    {walletCount} wallets
                  </span>
                  <span>•</span>
                  <span>{(holdingPct * 100).toFixed(2)}% supply</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'overview' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('wallets')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'wallets' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              All Wallets ({walletCount})
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[65vh]">
          {activeView === 'overview' ? (
            <div className="p-5 space-y-5">
              {/* Main Performance Banner */}
              <div className={`rounded-xl p-4 border ${pnlBgColor}`}>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1">Total Value</div>
                    <div className="text-xl font-bold text-white">{formatValue(totalValue)}</div>
                  </div>
                  <div className="text-center border-x border-slate-700/50 px-4">
                    <div className="text-xs text-slate-400 mb-1">Total Return</div>
                    <div className={`text-xl font-bold ${pnlColor}`}>
                      {pnlPct >= 0 ? '+' : ''}{(pnlPct * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center border-r border-slate-700/50 pr-4">
                    <div className="text-xs text-slate-400 mb-1">PnL Value</div>
                    <div className={`text-xl font-bold ${pnlColor}`}>
                      {pnlValue >= 0 ? '+' : ''}{formatValue(pnlValue)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1">Token Amount</div>
                    <div className="text-lg font-bold text-white">{formatValue(totalAmount)}</div>
                    <div className="text-xs text-slate-500">{tokenSymbol}</div>
                  </div>
                </div>
              </div>
              
              {/* Wallet Composition */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FontAwesomeIcon icon={faUsers} className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-semibold text-white">Wallet Composition</h4>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {regularWallets > 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
                      <FontAwesomeIcon icon={faWallet} className="w-5 h-5 text-slate-400 mb-2" data-tooltip="Wallet" />
                      <div className="text-lg font-bold text-white">{regularWallets}</div>
                      <div className="text-xs text-slate-500">Wallets</div>
                    </div>
                  )}
                  {exchangeCount > 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
                      <FontAwesomeIcon icon={faBuildingColumns} className="w-5 h-5 text-blue-400 mb-2" data-tooltip="Exchange" />
                      <div className="text-lg font-bold text-white">{exchangeCount}</div>
                      <div className="text-xs text-slate-500">Exchanges</div>
                    </div>
                  )}
                  {contractCount > 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
                      <FontAwesomeIcon icon={faFileLines} className="w-5 h-5 text-purple-400 mb-2" data-tooltip="Contract" />
                      <div className="text-lg font-bold text-white">{contractCount}</div>
                      <div className="text-xs text-slate-500">Contracts</div>
                    </div>
                  )}
                  {kolCount > 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
                      <FontAwesomeIcon icon={faMicrophoneLines} className="w-5 h-5 text-yellow-400 mb-2" data-tooltip="Influencer" />
                      <div className="text-lg font-bold text-white">{kolCount}</div>
                      <div className="text-xs text-slate-500">KOLs</div>
                    </div>
                  )}
                </div>
                
                {/* Tag Stats */}
                {(tagCounts.whale > 0 || tagCounts.top > 0 || tagCounts.fresh > 0) && (
                  <div className="flex gap-3 mt-3">
                    {tagCounts.whale > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg text-xs">
                        <img src="/icon/whale.min.svg" alt="" className="w-4 h-4" />
                        <span className="text-slate-300">{tagCounts.whale} Whales</span>
                      </div>
                    )}
                    {tagCounts.top > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg text-xs">
                        <FontAwesomeIcon icon={faCrown} className="w-4 h-4 text-yellow-400" />
                        <span className="text-slate-300">{tagCounts.top} Top Holders</span>
                      </div>
                    )}
                    {tagCounts.fresh > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg text-xs">
                        <FontAwesomeIcon icon={faLeaf} className="w-4 h-4 text-green-400" />
                        <span className="text-slate-300">{tagCounts.fresh} Fresh Wallets</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Trading Activity */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-semibold text-white">Cluster Trading Activity</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <FontAwesomeIcon icon={faArrowTrendUp} className="w-3 h-3 text-green-400" />
                      Total Bought
                    </div>
                    <div className="text-xl font-bold text-white">{formatValue(boughtValue)}</div>
                    <div className="text-xs text-slate-500 mt-1">Avg cost: {formatPrice(avgCost)}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <FontAwesomeIcon icon={faArrowTrendDown} className="w-3 h-3 text-red-400" />
                      Total Sold
                    </div>
                    <div className="text-xl font-bold text-white">{formatValue(soldValue)}</div>
                    <div className="text-xs text-slate-500 mt-1">Avg sell: {formatPrice(avgSell)}</div>
                  </div>
                </div>
              </div>
              
              {/* Top Holders in Cluster */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FontAwesomeIcon icon={faSackDollar} className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-semibold text-white">Top Holders in Cluster</h4>
                </div>
                <div className="space-y-2">
                  {topWallets.map((wallet, i) => {
                    const { info: exInfo } = getExchangeInfo(wallet.exchange)
                    const label = exInfo?.name || getWalletLabel({ ...wallet, clusterRank: cluster.rank, clusterName: cluster.clusterName, clusterSize: cluster.children.length } as WalletWithCluster)
                    const wPnl = parseFloat(wallet.tokenPnlPct || '0')
                    const wPnlColor = wPnl >= 0 ? 'text-green-400' : 'text-red-400'
                    
                    return (
                      <button
                        key={wallet.address}
                        onClick={() => onWalletClick(wallet.address)}
                        className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-700/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm font-bold" style={{ color: clusterColor }}>
                            #{i + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              {label && <span className="text-sm font-medium text-white">{label}</span>}
                              <span className="font-mono text-xs text-slate-400">{truncateAddress(wallet.address)}</span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatValue(parseFloat(wallet.holdingValue || '0'))} • {(parseFloat(wallet.holdingPct || '0') * 100).toFixed(2)}% supply
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm font-medium ${wPnlColor}`}>
                          {wPnl >= 0 ? '+' : ''}{(wPnl * 100).toFixed(1)}%
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* Best & Worst Performers */}
              {bestPerformer && worstPerformer && bestPerformer.address !== worstPerformer.address && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FontAwesomeIcon icon={faScaleBalanced} className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-semibold text-white">Performance Range</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                      <div className="text-xs text-green-400 mb-2">Best Performer</div>
                      <div className="font-mono text-xs text-slate-400 mb-1">{truncateAddress(bestPerformer.address)}</div>
                      <div className="text-lg font-bold text-green-400">
                        +{(parseFloat(bestPerformer.tokenPnlPct || '0') * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                      <div className="text-xs text-red-400 mb-2">Worst Performer</div>
                      <div className="font-mono text-xs text-slate-400 mb-1">{truncateAddress(worstPerformer.address)}</div>
                      <div className="text-lg font-bold text-red-400">
                        {(parseFloat(worstPerformer.tokenPnlPct || '0') * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Wallets List View */
            <div className="p-5">
              <div className="space-y-2">
                {cluster.children.map((wallet) => (
                  <WalletRow 
                    key={wallet.address}
                    wallet={{ ...wallet, clusterRank: cluster.rank, clusterName: cluster.clusterName, clusterSize: cluster.children.length } as WalletWithCluster}
                    chainId={chainId}
                    onClick={() => onWalletClick(wallet.address)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
