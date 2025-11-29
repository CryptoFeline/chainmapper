'use client'

import React, { useState, FormEvent, ChangeEvent, useCallback, useRef, useEffect } from 'react'
import type { ChainId, ClusterResponse, TokenInfoResponse } from '@/types/api'
import { 
  fetchTokenFullData, 
  validateTokenAddress, 
  ApiError, 
  getErrorMessage,
  addRecentToken,
  getRecentTokens,
  getFavoriteTokens,
  addFavoriteToken,
  removeFavoriteToken,
  isFavoriteToken,
  RecentToken,
  FavoriteToken
} from '@/lib/api'
import { CHAIN_OPTIONS } from '@/lib/constants'
import { WalletWithCluster, getExchangeInfo } from '@/utils/walletUtils'
import BubbleMap, { BubbleMapRef, BubbleNode, HighlightFilter } from '@/components/BubbleMap'
import WalletRow from '@/components/WalletRow'
import WalletDetailModal from '@/components/WalletDetailModal'
import ClusterDetailModal from '@/components/ClusterDetailModal'
import TokenDetailModal from '@/components/TokenDetailModal'
import { formatAmount, formatValue, formatPercent, truncateAddress, formatPrice, flattenTags } from '@/utils/formatters'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faHexagonNodes, 
  faCopy, 
  faArrowUpRightFromSquare, 
  faBars, 
  faChevronRight,
  faLayerGroup,
  faWallet,
  faChartPie,
  faBuildingColumns,
  faFileLines,
  faMicrophoneLines,
  faSeedling,
  faXmark,
  faArrowUpWideShort,
  faArrowDownWideShort,
  faCircleNodes,
  faRobot,
  faFish,
  faGlasses,
  faCode,
  faCrosshairs,
  faDroplet,
  faStar,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons'

/** Search state */
interface SearchResult {
  cluster: ClusterResponse;
  tokenInfo: TokenInfoResponse;
}

export default function Home(): React.JSX.Element {
  const [tokenAddress, setTokenAddress] = useState<string>('')
  const [selectedChain, setSelectedChain] = useState<ChainId>(1)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isChainSelectorOpen, setIsChainSelectorOpen] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'clusters' | 'wallets'>('overview')
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [selectedNode, setSelectedNode] = useState<BubbleNode | null>(null)
  const [walletDetailAddress, setWalletDetailAddress] = useState<string | null>(null)
  const [clusterDetailId, setClusterDetailId] = useState<number | null>(null)
  const [walletSortBy, setWalletSortBy] = useState<'holding' | 'pnl' | 'value'>('holding')
  const [walletSortAsc, setWalletSortAsc] = useState<boolean>(false)
  const [walletFilter, setWalletFilter] = useState<'all' | 'whale' | 'exchange' | 'contract'>('all')
  const [highlightFilter, setHighlightFilter] = useState<string | null>(null) // For highlighting nodes by filter
  const [hiddenWallets, setHiddenWallets] = useState<Set<string>>(new Set())
  const [highlightedWallets, setHighlightedWallets] = useState<Set<string>>(new Set())
  const [tokenDetailOpen, setTokenDetailOpen] = useState<boolean>(false)
  const [recentTokens, setRecentTokens] = useState<RecentToken[]>([])
  const [favoriteTokens, setFavoriteTokens] = useState<FavoriteToken[]>([])
  const [isFavorite, setIsFavorite] = useState<boolean>(false)
  
  const bubbleMapRef = useRef<BubbleMapRef>(null)

  const selectedChainConfig = CHAIN_OPTIONS.find(c => c.id === selectedChain) ?? CHAIN_OPTIONS[0]
  
  // Load recent and favorite tokens on mount
  useEffect(() => {
    setRecentTokens(getRecentTokens())
    setFavoriteTokens(getFavoriteTokens())
  }, [])
  
  // Check if current token is a favorite when result changes
  useEffect(() => {
    if (result?.tokenInfo?.data?.tokenContractAddress) {
      setIsFavorite(isFavoriteToken(result.tokenInfo.data.tokenContractAddress, selectedChain))
    }
  }, [result, selectedChain])
  
  // Toggle favorite status
  const toggleFavorite = useCallback(() => {
    if (!result?.tokenInfo?.data) return
    
    const tokenData = result.tokenInfo.data
    const address = tokenData.tokenContractAddress
    
    if (isFavorite) {
      removeFavoriteToken(address, selectedChain)
      setIsFavorite(false)
    } else {
      addFavoriteToken({
        address,
        chainId: selectedChain,
        name: tokenData.tokenSymbol || 'Unknown',
        symbol: tokenData.tokenSymbol || '???',
        logoUrl: tokenData.tokenLogoUrl
      })
      setIsFavorite(true)
    }
    // Refresh favorites list
    setFavoriteTokens(getFavoriteTokens())
  }, [result, selectedChain, isFavorite])
  
  // Quick search from recent/favorite token
  const quickSearch = useCallback((address: string, chainId: ChainId) => {
    setTokenAddress(address)
    setSelectedChain(chainId)
    // Trigger search programmatically after state updates
    setTimeout(() => {
      const form = document.querySelector('form')
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    }, 100)
  }, [])
  
  // Remove a favorite
  const handleRemoveFavorite = useCallback((address: string, chainId: ChainId, e: React.MouseEvent) => {
    e.stopPropagation()
    removeFavoriteToken(address, chainId)
    setFavoriteTokens(getFavoriteTokens())
  }, [])
  
  // Get wallet details for modal
  const walletDetail = walletDetailAddress && result?.cluster?.data?.clusterList
    ? result.cluster.data.clusterList.flatMap(c => 
        c.children.map(w => ({ ...w, clusterRank: c.rank, clusterName: c.clusterName, clusterSize: c.children.length }))
      ).find(w => w.address === walletDetailAddress)
    : null
  
  // Get cluster details for modal
  const clusterDetail = clusterDetailId !== null && result?.cluster?.data?.clusterList
    ? result.cluster.data.clusterList.find(c => c.clusterId === clusterDetailId)
    : null

  const handleSearch = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!tokenAddress.trim()) return
    
    if (!validateTokenAddress(tokenAddress.trim(), selectedChain)) {
      setError(selectedChain === 501 
        ? 'Invalid Solana address' 
        : 'Invalid EVM address')
      return
    }
    
    setIsLoading(true)
    setError(null)
    // Don't clear result here - keep showing current data while loading
    
    try {
      console.log('Searching for:', tokenAddress, 'on chain:', selectedChain)
      const data = await fetchTokenFullData(tokenAddress.trim(), selectedChain)
      
      setResult(data)
      setIsPanelOpen(false) // Start with panel closed on new search
      
      if (data.tokenInfo?.data) {
        addRecentToken({
          address: tokenAddress.trim(),
          chainId: selectedChain,
          name: data.tokenInfo.data.tokenName || 'Unknown',
          symbol: data.tokenInfo.data.tokenSymbol || '???',
          logoUrl: data.tokenInfo.data.tokenLogoUrl,
        })
      }
    } catch (err) {
      console.error('Search failed:', err)
      if (err instanceof ApiError) {
        setError(getErrorMessage(err.code))
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
      // Only clear result on error if user wants to see the error clearly
      // setResult(null) - keep the old result visible
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddressChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setTokenAddress(e.target.value)
  }

  const handleChainSelect = (chainId: ChainId): void => {
    setSelectedChain(chainId)
    setIsChainSelectorOpen(false)
  }

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(tokenAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [tokenAddress])

  const openExplorer = useCallback(() => {
    window.open(`${selectedChainConfig.explorer}${tokenAddress}`, '_blank')
  }, [selectedChainConfig.explorer, tokenAddress])

  // Landing page (no result)
  if (!result) {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Header */}
        <header className="p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
            <FontAwesomeIcon icon={faHexagonNodes} className="w-6 h-6 text-white" />
            <h1 className="text-2xl text-white font-semibold">Chainmapper</h1>
          </div>
        </header>

        {/* Main Content */}
        <section className="flex-1 flex flex-col items-center justify-center p-4 w-full">
          {/* Search Section */}
          <div className="w-full max-w-2xl mb-8">
            <form onSubmit={handleSearch}>
              <div className="flex gap-2">
                <ChainSelector 
                  selectedChain={selectedChain}
                  isOpen={isChainSelectorOpen}
                  onToggle={() => setIsChainSelectorOpen(!isChainSelectorOpen)}
                  onSelect={handleChainSelect}
                  chainConfig={selectedChainConfig}
                />
                <div className="relative flex flex-1">
                  <input
                    type="text"
                    value={tokenAddress}
                    onChange={handleAddressChange}
                    placeholder="Enter token address..."
                    className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-700 rounded-xl 
                               text-white placeholder-slate-400 focus:outline-none focus:border-white
                               focus:ring-2 focus:ring-white/20 transition-all font-mono text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !tokenAddress.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg
                               bg-transparent hover:bg-white/50 disabled:opacity-50
                               disabled:cursor-not-allowed transition-colors"
                    aria-label="Search"
                  >
                    {isLoading ? (
                      <FontAwesomeIcon icon={faHexagonNodes} className="w-5 h-5 animate-spin text-white" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Recent Searches - Horizontal Scroll */}
          {recentTokens.length > 0 && (
            <div className="w-full max-w-2xl mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-medium text-slate-400">Recent Searches</h2>
              </div>
              <div 
                className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent" 
                style={{ 
                  scrollbarColor: '#161f31 transparent',
                  maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)'
                }}
              >
                {recentTokens.map((token) => {
                  const chainConfig = CHAIN_OPTIONS.find(c => c.id === token.chainId)
                  return (
                    <button
                      key={`${token.chainId}-${token.address}`}
                      onClick={() => quickSearch(token.address, token.chainId)}
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 
                                 border border-slate-700 hover:border-slate-600 rounded-xl transition-all group"
                    >
                      <div className="relative">
                        {token.logoUrl ? (
                          <img src={token.logoUrl} alt={token.symbol} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-400">{token.symbol?.charAt(0) || '?'}</span>
                          </div>
                        )}
                        {chainConfig && (
                          <img 
                            src={chainConfig.logo} 
                            alt={chainConfig.name}
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-slate-800"
                          />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-white group-hover:text-white/90">{token.symbol}</div>
                        <div className="text-xs text-slate-500 font-mono">{truncateAddress(token.address)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Favorites - Vertical List */}
          {favoriteTokens.length > 0 && (
            <div className="w-full max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-medium text-slate-400">Favorites</h2>
              </div>
              <div className="space-y-2">
                {favoriteTokens.map((token) => {
                  const chainConfig = CHAIN_OPTIONS.find(c => c.id === token.chainId)
                  return (
                    <div
                      key={`fav-${token.chainId}-${token.address}`}
                      className="flex items-center gap-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 
                                 border border-slate-700/50 hover:border-slate-600/50 rounded-xl 
                                 transition-all cursor-pointer group"
                      onClick={() => quickSearch(token.address, token.chainId)}
                    >
                      <div className="relative">
                        {token.logoUrl ? (
                          <img src={token.logoUrl} alt={token.symbol} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                            <span className="text-sm font-bold text-slate-400">{token.symbol?.charAt(0) || '?'}</span>
                          </div>
                        )}
                        {chainConfig && (
                          <img 
                            src={chainConfig.logo} 
                            alt={chainConfig.name}
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{token.name}</span>
                          <span className="text-sm text-slate-400">{token.symbol}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate">{token.address}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleRemoveFavorite(token.address, token.chainId, e)}
                          className="p-2 text-slate-500 hover:text-red-400 click:text-red-400 
                                     rounded-lg transition-colors"
                          title="Remove from favorites"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty state when no recent/favorites */}
          {recentTokens.length === 0 && favoriteTokens.length === 0 && (
            <div className="text-center text-slate-500 mt-4">
              <p className="text-sm">Enter a token address to explore holder intelligence</p>
            </div>
          )}
        </section>

        <footer className="p-4 text-center text-sm text-slate-500">
          2025 © Chainmapper
        </footer>
      </main>
    )
  }

  // Result page - Bubble map focused layout
  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Compact Header with Search */}
      <header className="flex-shrink-0 p-2 md:p-3 border-b border-slate-800 bg-slate-950 backdrop-blur-sm z-20">
        <div className="flex justify-between items-center gap-2 md:gap-4">
          {/* Logo */}
          <button 
            onClick={() => {
              setResult(null)
              setTokenAddress('')
              setError(null)
            }}
            className="flex items-center gap-1.5 flex-shrink-0"
          >
            <FontAwesomeIcon icon={faHexagonNodes} className="w-5 h-5 text-white" />
            <span className="text-lg font-semibold hidden sm:block">Chainmapper</span>
          </button>

          {/* Search Bar - Compact in header */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="flex gap-1.5">
              <ChainSelector 
                selectedChain={selectedChain}
                isOpen={isChainSelectorOpen}
                onToggle={() => setIsChainSelectorOpen(!isChainSelectorOpen)}
                onSelect={handleChainSelect}
                chainConfig={selectedChainConfig}
                compact
              />
              <div className="relative flex flex-1">
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={handleAddressChange}
                  placeholder="Token address..."
                  className="w-full px-3 py-2 pr-10 bg-slate-800/50 border border-slate-700 rounded-lg 
                             text-white placeholder-slate-400 focus:outline-none focus:border-white
                             transition-all font-mono text-xs"
                />
                <button
                  type="submit"
                  disabled={isLoading || !tokenAddress.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded
                             bg-transparent hover:bg-white/50 disabled:opacity-50 transition-colors"
                  aria-label="Search"
                >
                  {isLoading ? (
                    <FontAwesomeIcon icon={faHexagonNodes} className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Token Info Badge - Compact */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Token logo with chain badge - clickable to open details */}
            <button 
              onClick={() => setTokenDetailOpen(true)}
              className="relative hidden sm:block hover:opacity-80 transition-opacity"
              title="View token details"
            >
              {result.tokenInfo?.data?.tokenLogoUrl ? (
                <img 
                  src={result.tokenInfo.data.tokenLogoUrl} 
                  alt={result.tokenInfo.data.tokenName}
                  className="w-10 h-10 rounded-full border border-slate-600"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                  {(result.tokenInfo?.data?.tokenSymbol || '?')[0]}
                </div>
              )}
              {/* Chain badge */}
              <img 
                src={selectedChainConfig.logo} 
                alt={selectedChainConfig.name}
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900"
              />
            </button>

            <div className="hidden md:flex items-center gap-2">
              {/* Clickable token info area */}
              <button
                onClick={() => setTokenDetailOpen(true)}
                className="text-left hover:bg-slate-700/50 rounded-lg px-2 py-1 transition-colors"
                title="View token details"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">
                    {result.tokenInfo?.data?.tokenSymbol || '???'}
                  </span>
                  <span className="text-slate-400 text-xs font-mono">
                    {truncateAddress(tokenAddress)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{formatPrice(result.tokenInfo?.data?.price || 0)}</span>
                  {result.tokenInfo?.data?.change && (
                    <span className={parseFloat(result.tokenInfo.data.change) >= 0 ? 'text-green-400' : 'text-red-400'}>
                      <span className='text-slate-400'>24H: </span>
                      {parseFloat(result.tokenInfo.data.change) >= 0 ? '+' : ''}
                      {formatAmount(parseFloat(result.tokenInfo.data.change))}%
                    </span>
                  )}
                </div>
              </button>
              {/* Action buttons - separate from clickable area */}
              <div className="flex items-center gap-0.5">
                <button 
                  onClick={copyAddress}
                  className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                  title={copied ? 'Copied!' : 'Copy address'}
                >
                  <FontAwesomeIcon icon={faCopy} className={`w-3 h-3 ${copied ? 'text-green-400' : 'text-slate-400'}`} />
                </button>
                <button 
                  onClick={openExplorer}
                  className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                  title="View on explorer"
                >
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3 h-3 text-slate-400" />
                </button>
                <button 
                  onClick={toggleFavorite}
                  className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <FontAwesomeIcon 
                    icon={isFavorite ? faStar : faStarRegular} 
                    className={`w-3.5 h-3.5 ${isFavorite ? 'text-yellow-500' : 'text-slate-400'}`} 
                  />
                </button>
              </div>
            </div>
          </div>        
          
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Bubble Map Area - Takes full width */}
        <div className="flex-1 relative">
          {/* Bubble Map Visualization */}
          {result.cluster && (
            <BubbleMap
              ref={bubbleMapRef}
              data={result.cluster}
              onNodeSelect={(node: BubbleNode | null) => setSelectedNode(node)}
              onNodeClick={(node: BubbleNode) => {
                // Open wallet detail modal when clicking a node
                setWalletDetailAddress(node.address)
              }}
              selectedNode={selectedNode}
              highlightFilter={highlightFilter ? JSON.parse(highlightFilter) as HighlightFilter : null}
            />
          )}

          {/* Floating Controls */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <button 
              onClick={() => bubbleMapRef.current?.zoomIn()}
              className="w-10 h-10 bg-slate-900 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors border border-slate-700"
              title="Zoom In"
            >
              <span className="text-lg font-bold">+</span>
            </button>
            <button 
              onClick={() => bubbleMapRef.current?.zoomOut()}
              className="w-10 h-10 bg-slate-900 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors border border-slate-700"
              title="Zoom Out"
            >
              <span className="text-lg font-bold">−</span>
            </button>
            <button 
              onClick={() => bubbleMapRef.current?.resetZoom()}
              className="w-10 h-10 bg-slate-900 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors border border-slate-700"
              title="Reset View"
            >
              <FontAwesomeIcon icon={faLayerGroup} className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Panel Toggle Button - Hidden on mobile when panel is open */}
        <button 
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`absolute top-4 z-20 w-10 h-10 bg-slate-900 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-all duration-300 border border-slate-700 ${isPanelOpen ? 'hidden md:flex' : 'flex'}`}
          style={{ right: isPanelOpen ? 'calc(24rem + 1rem)' : '1rem' }}
          title={isPanelOpen ? 'Hide Panel' : 'Show Panel'}
        >
          <FontAwesomeIcon icon={isPanelOpen ? faChevronRight : faBars} className="w-4 h-4" />
        </button>

        {/* Side Panel - Full screen on mobile, collapsible on desktop */}
        <div 
          className={`
            bg-slate-950 border-l border-slate-800 
            transition-all duration-300 ease-in-out overflow-hidden
            ${isPanelOpen 
              ? 'fixed inset-0 z-30 md:relative md:inset-auto md:z-auto md:w-96' 
              : 'w-0'
            }
          `}
        >
          <div className="w-full md:w-96 h-full flex flex-col">
            {/* Tab Navigation with Close button on mobile - Icons only on small screens */}
            <div className="flex-shrink-0 border-b border-slate-700/50">
              <div className="flex items-center">
                <button
                  onClick={() => { setActiveTab('overview'); setHighlightFilter(null); }}
                  className={`flex-1 py-3 text-center text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === 'overview' 
                      ? 'text-white border-b-2 border-white bg-slate-900' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title="Overview"
                >
                  <FontAwesomeIcon icon={faChartPie} className="w-4 h-4" />
                  <span className="hidden sm:inline">Overview</span>
                </button>
                <button
                  onClick={() => { setActiveTab('clusters'); setHighlightFilter(null); }}
                  className={`flex-1 py-3 text-center text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === 'clusters' 
                      ? 'text-white border-b-2 border-white bg-slate-900' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title="Clusters"
                >
                  <FontAwesomeIcon icon={faCircleNodes} className="w-4 h-4" />
                  <span className="hidden sm:inline">Clusters</span>
                </button>
                <button
                  onClick={() => { setActiveTab('wallets'); setHighlightFilter(null); }}
                  className={`flex-1 py-3 text-center text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === 'wallets' 
                      ? 'text-white border-b-2 border-white bg-slate-900' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title="Wallets"
                >
                  <FontAwesomeIcon icon={faWallet} className="w-4 h-4" />
                  <span className="hidden sm:inline">{result.cluster?.data?.clusterList?.reduce((acc, c) => acc + c.children.length, 0) || 0}</span>
                </button>
                {/* Close button - visible on mobile */}
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="md:hidden p-3 text-slate-400 hover:text-white hover:bg-slate-800/20"
                  title="Close Panel"
                >
                  <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'overview' ? (
                <OverviewTab 
                  result={result} 
                  tokenPrice={parseFloat(result.tokenInfo?.data?.price || '0')}
                  onHighlight={(filter) => setHighlightFilter(filter ? JSON.stringify(filter) : null)}
                  activeHighlight={highlightFilter}
                />
              ) : activeTab === 'clusters' ? (
                <ClustersTab 
                  result={result}
                  chainId={selectedChain}
                  tokenPrice={parseFloat(result.tokenInfo?.data?.price || '0')}
                  onClusterClick={(clusterId) => {
                    setClusterDetailId(clusterId)
                    const cluster = result.cluster?.data?.clusterList?.find(c => c.clusterId === clusterId)
                    if (cluster && cluster.children.length > 0) {
                      bubbleMapRef.current?.highlightNode(cluster.children[0].address)
                    }
                  }}
                  onWalletClick={(address) => {
                    bubbleMapRef.current?.highlightNode(address)
                    setWalletDetailAddress(address)
                  }}
                  onHighlightChange={(filter) => setHighlightFilter(filter)}
                />
              ) : (
                <WalletsTab 
                  result={result} 
                  sortBy={walletSortBy}
                  sortAsc={walletSortAsc}
                  filter={walletFilter}
                  chainId={selectedChain}
                  hiddenWallets={hiddenWallets}
                  highlightedWallets={highlightedWallets}
                  onSortChange={(sort) => setWalletSortBy(sort)}
                  onSortDirectionChange={() => setWalletSortAsc(!walletSortAsc)}
                  onFilterChange={(f) => setWalletFilter(f)}
                  onWalletClick={(address) => {
                    bubbleMapRef.current?.highlightNode(address)
                    setWalletDetailAddress(address)
                    // Just highlight and open modal, BubbleMap will handle selectedNode
                  }}
                  onWalletHide={(address, hidden) => {
                    setHiddenWallets(prev => {
                      const next = new Set(prev)
                      if (hidden) {
                        next.add(address)
                      } else {
                        next.delete(address)
                      }
                      return next
                    })
                  }}
                  onWalletHighlight={(address, highlighted) => {
                    setHighlightedWallets(prev => {
                      const next = new Set(prev)
                      if (highlighted) {
                        next.add(address)
                      } else {
                        next.delete(address)
                      }
                      return next
                    })
                    // Also update bubble map highlight
                    if (highlighted) {
                      bubbleMapRef.current?.highlightNode(address)
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Token Info Bar (visible on small screens) */}
      <div className="md:hidden flex-shrink-0 p-2 border-t border-slate-700/50 bg-slate-900/95 flex items-center justify-between w-full">
        {/* Clickable token info area */}
        <button 
          onClick={() => setTokenDetailOpen(true)}
          className="flex items-center gap-2 flex-1 text-left hover:bg-slate-800/50 rounded-lg p-1 -m-1 transition-colors"
        >
          <div className="relative flex-shrink-0">
            {result.tokenInfo?.data?.tokenLogoUrl ? (
              <img 
                src={result.tokenInfo.data.tokenLogoUrl} 
                alt=""
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                {(result.tokenInfo?.data?.tokenSymbol || '?')[0]}
              </div>
            )}
            <img 
              src={selectedChainConfig.logo} 
              alt=""
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-slate-900"
            />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-semibold text-sm truncate">
              {result.tokenInfo?.data?.tokenName} 
              <span className="text-xs text-slate-500">(${result.tokenInfo?.data?.tokenSymbol})</span>
            </span>
            <div className="flex items-center gap-1 text-xs">
              <span className="font-medium">{formatPrice(result.tokenInfo?.data?.price || 0)}</span>
              {result.tokenInfo?.data?.change && (
                <span className={parseFloat(result.tokenInfo.data.change) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {parseFloat(result.tokenInfo.data.change) >= 0 ? '+' : ''}
                  {formatAmount(parseFloat(result.tokenInfo.data.change))}%
                </span>
              )}
            </div>
          </div>
        </button>
        
        {/* Action buttons - separate from clickable area */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button 
            onClick={copyAddress}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title={copied ? 'Copied!' : 'Copy address'}
          >
            <FontAwesomeIcon icon={faCopy} className={`w-4 h-4 ${copied ? 'text-green-400' : 'text-slate-400'}`} />
          </button>
          <button 
            onClick={openExplorer}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="View on explorer"
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-4 h-4 text-slate-400" />
          </button>
          <button 
            onClick={toggleFavorite}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <FontAwesomeIcon 
              icon={isFavorite ? faStar : faStarRegular} 
              className={`w-4 h-4 ${isFavorite ? 'text-yellow-500' : 'text-slate-400'}`} 
            />
          </button>
        </div>
      </div>
      
      {/* Wallet Detail Modal */}
      {walletDetail && (
        <WalletDetailModal 
          wallet={walletDetail as WalletWithCluster}
          chainId={selectedChain}
          tokenSymbol={result.tokenInfo?.data?.tokenSymbol || '???'}
          priceChange={result.tokenInfo?.data?.change ? parseFloat(result.tokenInfo.data.change) : 0}
          onClose={() => setWalletDetailAddress(null)}
        />
      )}
      
      {/* Cluster Detail Modal */}
      {clusterDetail && (
        <ClusterDetailModal 
          cluster={{
            ...clusterDetail,
            children: clusterDetail.children.map(w => ({ 
              ...w, 
              clusterRank: clusterDetail.rank, 
              clusterName: clusterDetail.clusterName,
              clusterSize: clusterDetail.children.length
            }))
          }}
          chainId={selectedChain}
          tokenSymbol={result.tokenInfo?.data?.tokenSymbol || '???'}
          onClose={() => setClusterDetailId(null)}
          onWalletClick={(address) => {
            setClusterDetailId(null)
            setWalletDetailAddress(address)
          }}
        />
      )}
      
      {/* Token Detail Modal */}
      {tokenDetailOpen && result.tokenInfo && (
        <TokenDetailModal 
          tokenInfo={result.tokenInfo}
          chainId={selectedChain}
          clusterData={result.cluster}
          onClose={() => setTokenDetailOpen(false)}
        />
      )}
    </main>
  )
}

/** Chain Selector Component */
function ChainSelector({ 
  selectedChain, 
  isOpen, 
  onToggle, 
  onSelect, 
  chainConfig,
  compact = false 
}: { 
  selectedChain: ChainId; 
  isOpen: boolean; 
  onToggle: () => void; 
  onSelect: (id: ChainId) => void; 
  chainConfig: typeof CHAIN_OPTIONS[0];
  compact?: boolean;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-2 bg-slate-800/50 border border-slate-700 
                   hover:bg-slate-700/50 transition-colors ${
                     compact ? 'px-2 py-2 rounded-lg' : 'px-3 py-3 rounded-xl'
                   }`}
        aria-label="Select blockchain"
      >
        <img 
          src={chainConfig.logo} 
          alt={chainConfig.name}
          className={compact ? 'w-5 h-5 rounded-full' : 'w-6 h-6 rounded-full'}
        />
        <svg 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''} ${compact ? 'w-3 h-3' : 'w-4 h-4'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 py-2 bg-slate-800 border border-slate-700 
                        rounded-xl shadow-xl z-50 min-w-[160px]">
          {CHAIN_OPTIONS.map((chain) => (
            <button
              key={chain.id}
              type="button"
              onClick={() => onSelect(chain.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 
                          transition-colors text-left ${
                            chain.id === selectedChain ? 'bg-slate-700/30' : ''
                          }`}
            >
              <img 
                src={chain.logo} 
                alt={chain.name}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-sm">{chain.name}</span>
              {chain.id === selectedChain && (
                <svg className="w-4 h-4 ml-auto text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Overview Tab Component */
function OverviewTab({ 
  result, 
  tokenPrice,
  onHighlight,
  activeHighlight 
}: { 
  result: SearchResult; 
  tokenPrice: number;
  onHighlight?: (filter: HighlightFilter | null) => void;
  activeHighlight?: string | null;
}) {
  const cluster = result.cluster?.data
  const tokenInfo = result.tokenInfo?.data
  
  if (!cluster) return <div className="text-slate-400 text-sm">No holder data available</div>
  
  // Get all wallets sorted by holding
  const allWallets = cluster.clusterList
    .flatMap(c => c.children)
    .sort((a, b) => parseFloat(b.holdingPct) - parseFloat(a.holdingPct))
  
  // Calculate holder bracket stats
  const calculateBracketStats = (wallets: typeof allWallets) => {
    const totalHolding = wallets.reduce((sum, w) => sum + parseFloat(w.holdingAmount || '0'), 0)
    const totalPct = wallets.reduce((sum, w) => sum + parseFloat(w.holdingPct || '0'), 0)
    const avgPnl = wallets.length > 0 
      ? wallets.reduce((sum, w) => sum + parseFloat(w.tokenPnl || '0'), 0) / wallets.length 
      : 0
    const avgHoldingTime = wallets.length > 0
      ? wallets.reduce((sum, w) => sum + (w.holdingAvgTime || 0), 0) / wallets.length
      : 0
    
    // Weighted average cost and sell
    const totalBought = wallets.reduce((sum, w) => sum + parseFloat(w.boughtValue || '0'), 0)
    const totalSold = wallets.reduce((sum, w) => sum + parseFloat(w.soldValue || '0'), 0)
    const totalHoldingVal = wallets.reduce((sum, w) => sum + parseFloat(w.holdingValue || '0'), 0)
    
    const avgCost = totalBought > 0 && totalHolding > 0 ? totalBought / totalHolding : 0
    const avgSell = totalSold > 0 ? totalSold / wallets.filter(w => parseFloat(w.soldValue || '0') > 0).reduce((sum, w) => sum + parseFloat(w.holdingAmount || '0'), 0) || 0 : 0
    
    // Trend - count buys vs sells
    let buyCount = 0, sellCount = 0
    wallets.forEach(w => {
      const tags = flattenTags(w.tagList)
      if (tags.some(t => t.toLowerCase().includes('buy'))) buyCount++
      if (tags.some(t => t.toLowerCase().includes('sell'))) sellCount++
    })
    const trend = buyCount > sellCount ? 'Buy' : sellCount > buyCount ? 'Sell' : 'Transfer'
    
    return { totalHolding, totalPct, avgPnl, avgHoldingTime, avgCost, avgSell, trend, totalValue: totalHoldingVal }
  }
  
  const top10 = allWallets.slice(0, 10)
  const top50 = allWallets.slice(0, 50)
  const top100 = allWallets.slice(0, 100)
  
  const top10Stats = calculateBracketStats(top10)
  const top50Stats = calculateBracketStats(top50)
  const top100Stats = calculateBracketStats(top100)
  
  // Tag-based groupings
  const getTaggedWallets = (tag: string) => {
    return allWallets.filter(w => {
      const tags = flattenTags(w.tagList)
      const tagLower = tag.toLowerCase()
      if (tagLower === 'whale') return tags.some(t => t.toLowerCase().includes('whale'))
      if (tagLower === 'exchange') return getExchangeInfo(w.exchange).isExchange
      if (tagLower === 'bundle') return tags.some(t => t.toLowerCase().includes('bundle'))
      if (tagLower === 'sniper') return tags.some(t => t.toLowerCase().includes('sniper'))
      if (tagLower === 'fresh') return tags.some(t => t.toLowerCase().includes('fresh'))
      if (tagLower === 'contract') return w.contract
      return tags.some(t => t.toLowerCase().includes(tagLower))
    })
  }
  
  const whaleWallets = getTaggedWallets('whale')
  const exchangeWallets = getTaggedWallets('exchange')
  const bundlerWallets = getTaggedWallets('bundle')
  const sniperWallets = getTaggedWallets('sniper')
  const freshWallets = getTaggedWallets('fresh')
  const smartMoneyWallets = getTaggedWallets('smartMoney')
  const devWallets = getTaggedWallets('dev')
  const insiderWallets = getTaggedWallets('insider')
  const contractWallets = allWallets.filter(w => w.contract)
  const mevBotWallets = allWallets.filter(w => {
    const tags = flattenTags(w.tagList)
    return tags.some(t => t.toLowerCase().includes('mevbot'))
  })
  const liquidityPoolWallets = allWallets.filter(w => {
    const tags = flattenTags(w.tagList)
    return tags.some(t => t.toLowerCase().includes('liquiditypool'))
  })
  const kolWallets = allWallets.filter(w => w.kol)
  
  // Format holding period - input is in seconds (API returns seconds)
  const formatHoldingPeriod = (seconds: number) => {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return '--'
    
    // If value seems too large (> 10 years in seconds), it might be in milliseconds
    const normalizedSeconds = seconds > 315360000 ? seconds / 1000 : seconds
    
    const days = Math.floor(normalizedSeconds / 86400)
    if (days >= 365) return `${Math.floor(days / 365)}y ${days % 365}d`
    if (days >= 30) return `${Math.floor(days / 30)}mo ${days % 30}d`
    if (days > 0) return `${days}d ${Math.floor((normalizedSeconds % 86400) / 3600)}h`
    const hours = Math.floor(normalizedSeconds / 3600)
    if (hours > 0) return `${hours}h ${Math.floor((normalizedSeconds % 3600) / 60)}m`
    const minutes = Math.floor(normalizedSeconds / 60)
    return minutes > 0 ? `${minutes}m` : '<1m'
  }
  
  // Price difference calculation
  const priceDiff = (cost: number) => {
    if (!tokenPrice || cost === 0) return null
    const diff = ((tokenPrice - cost) / cost) * 100
    return { value: diff, color: diff >= 0 ? 'text-green-400' : 'text-red-400' }
  }
  
  // Handle section click for highlighting
  const handleSectionClick = (filter: HighlightFilter) => {
    const filterStr = JSON.stringify(filter)
    if (activeHighlight === filterStr) {
      onHighlight?.(null)
    } else {
      onHighlight?.(filter)
    }
  }
  
  const isActive = (filter: HighlightFilter) => activeHighlight === JSON.stringify(filter)
  
  return (
    <div className="space-y-4">
      {/* Market Metrics */}
      {tokenInfo && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Market Data</h3>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Market Cap" value={formatValue(tokenInfo.marketCap)} compact />
            <MetricCard label="Liquidity" value={formatValue(tokenInfo.liquidity)} compact />
            <MetricCard label="24h Volume" value={formatValue(tokenInfo.volume)} compact />
            <MetricCard label="Holders" value={parseInt(tokenInfo.holders).toLocaleString()} compact />
          </div>
        </div>
      )}

      {/* Holder Bracket Performance */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Holder Performance</h3>
        <div className="space-y-2">
          {/* Top 10 */}
          <HolderBracketCard
            title="Top 10"
            stats={top10Stats}
            formatHoldingPeriod={formatHoldingPeriod}
            priceDiff={priceDiff}
            isActive={isActive({ type: 'rank', min: 1, max: 10 })}
            onClick={() => handleSectionClick({ type: 'rank', min: 1, max: 10 })}
          />
          {/* Top 50 */}
          <HolderBracketCard
            title="Top 50"
            stats={top50Stats}
            formatHoldingPeriod={formatHoldingPeriod}
            priceDiff={priceDiff}
            isActive={isActive({ type: 'rank', min: 1, max: 50 })}
            onClick={() => handleSectionClick({ type: 'rank', min: 1, max: 50 })}
          />
          {/* Top 100 */}
          <HolderBracketCard
            title="Top 100"
            stats={top100Stats}
            formatHoldingPeriod={formatHoldingPeriod}
            priceDiff={priceDiff}
            isActive={isActive({ type: 'rank', min: 1, max: 100 })}
            onClick={() => handleSectionClick({ type: 'rank', min: 1, max: 100 })}
          />
        </div>
      </div>

      {/* Tag-based Sections */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">By Type</h3>
        <div className="space-y-2">
          {whaleWallets.length > 0 && (
            <TagSectionCard
              title="Whales"
              icon={<img src="/icon/whale.min.svg" alt="" className="w-4 h-4" />}
              count={whaleWallets.length}
              stats={calculateBracketStats(whaleWallets)}
              formatHoldingPeriod={formatHoldingPeriod}
              priceDiff={priceDiff}
              isActive={isActive({ type: 'tag', tag: 'whale' })}
              onClick={() => handleSectionClick({ type: 'tag', tag: 'whale' })}
            />
          )}
          {exchangeWallets.length > 0 && (
            <TagSectionCard
              title="Exchanges"
              icon={<FontAwesomeIcon icon={faBuildingColumns} className="w-4 h-4 text-blue-400" />}
              count={exchangeWallets.length}
              stats={calculateBracketStats(exchangeWallets)}
              formatHoldingPeriod={formatHoldingPeriod}
              priceDiff={priceDiff}
              isActive={isActive({ type: 'tag', tag: 'exchange' })}
              onClick={() => handleSectionClick({ type: 'tag', tag: 'exchange' })}
            />
          )}
          {smartMoneyWallets.length > 0 && (
            <TagSectionCard
              title="Smart Money"
              icon={<FontAwesomeIcon icon={faGlasses} className="w-4 h-4 text-purple-400" />}
              count={smartMoneyWallets.length}
              stats={calculateBracketStats(smartMoneyWallets)}
              formatHoldingPeriod={formatHoldingPeriod}
              priceDiff={priceDiff}
              isActive={isActive({ type: 'tag', tag: 'smartmoney' })}
              onClick={() => handleSectionClick({ type: 'tag', tag: 'smartmoney' })}
            />
          )}
          {devWallets.length > 0 && (
            <TagSectionCard
              title="Developers"
              icon={<FontAwesomeIcon icon={faCode} className="w-4 h-4 text-cyan-400" />}
              count={devWallets.length}
              stats={calculateBracketStats(devWallets)}
              formatHoldingPeriod={formatHoldingPeriod}
              priceDiff={priceDiff}
              isActive={isActive({ type: 'tag', tag: 'dev' })}
              onClick={() => handleSectionClick({ type: 'tag', tag: 'dev' })}
            />
          )}
          {insiderWallets.length > 0 && (
            <TagSectionCard
              title="Insiders"
              icon={<FontAwesomeIcon icon={faFish} className="w-4 h-4 text-pink-400" />}
              count={insiderWallets.length}
              stats={calculateBracketStats(insiderWallets)}
              formatHoldingPeriod={formatHoldingPeriod}
              priceDiff={priceDiff}
              isActive={isActive({ type: 'tag', tag: 'insider' })}
              onClick={() => handleSectionClick({ type: 'tag', tag: 'insider' })}
            />
          )}
          {bundlerWallets.length > 0 && (
            <TagSectionCard
              title="Bundlers"
              icon={<FontAwesomeIcon icon={faLayerGroup} className="w-4 h-4 text-amber-400" />}
              count={bundlerWallets.length}
              stats={calculateBracketStats(bundlerWallets)}
              formatHoldingPeriod={formatHoldingPeriod}
              priceDiff={priceDiff}
              isActive={isActive({ type: 'tag', tag: 'bundle' })}
              onClick={() => handleSectionClick({ type: 'tag', tag: 'bundle' })}
            />
          )}
          {sniperWallets.length > 0 && (
            <TagSectionCard
              title="Snipers"
              icon={<FontAwesomeIcon icon={faCrosshairs} className="w-4 h-4 text-red-400" />}
              count={sniperWallets.length}
              stats={calculateBracketStats(sniperWallets)}
              formatHoldingPeriod={formatHoldingPeriod}
              priceDiff={priceDiff}
              isActive={isActive({ type: 'tag', tag: 'sniper' })}
              onClick={() => handleSectionClick({ type: 'tag', tag: 'sniper' })}
            />
          )}
          {mevBotWallets.length > 0 && (
            <TagSectionCard
              title="MEV Bots"
              icon={<FontAwesomeIcon icon={faRobot} className="w-4 h-4 text-orange-400" />}
              count={mevBotWallets.length}
              stats={calculateBracketStats(mevBotWallets)}
              formatHoldingPeriod={formatHoldingPeriod}
              priceDiff={priceDiff}
              isActive={isActive({ type: 'tag', tag: 'mevbot' })}
              onClick={() => handleSectionClick({ type: 'tag', tag: 'mevbot' })}
            />
          )}
          {freshWallets.length > 0 && (
            <TagSectionCard
              title="Fresh Wallets"
              icon={<FontAwesomeIcon icon={faSeedling} className="w-4 h-4 text-green-400" />}
              count={freshWallets.length}
              stats={calculateBracketStats(freshWallets)}
              formatHoldingPeriod={formatHoldingPeriod}
              priceDiff={priceDiff}
              isActive={isActive({ type: 'tag', tag: 'fresh' })}
              onClick={() => handleSectionClick({ type: 'tag', tag: 'fresh' })}
            />
          )}
          {liquidityPoolWallets.length > 0 && (
            <TagSectionCard
              title="Liquidity Pools"
              icon={<FontAwesomeIcon icon={faDroplet} className="w-4 h-4 text-sky-400" />}
              count={liquidityPoolWallets.length}
              stats={calculateBracketStats(liquidityPoolWallets)}
              formatHoldingPeriod={formatHoldingPeriod}
              priceDiff={priceDiff}
              isActive={isActive({ type: 'tag', tag: 'liquiditypool' })}
              onClick={() => handleSectionClick({ type: 'tag', tag: 'liquiditypool' })}
            />
          )}
          {contractWallets.length > 0 && (
            <TagSectionCard
              title="Contracts"
              icon={<FontAwesomeIcon icon={faFileLines} className="w-4 h-4 text-slate-400" />}
              count={contractWallets.length}
              stats={calculateBracketStats(contractWallets)}
              formatHoldingPeriod={formatHoldingPeriod}
              priceDiff={priceDiff}
              isActive={isActive({ type: 'tag', tag: 'contract' })}
              onClick={() => handleSectionClick({ type: 'tag', tag: 'contract' })}
            />
          )}
          {kolWallets.length > 0 && (
            <TagSectionCard
              title="KOLs"
              icon={<FontAwesomeIcon icon={faMicrophoneLines} className="w-4 h-4 text-yellow-400" />}
              count={kolWallets.length}
              stats={calculateBracketStats(kolWallets)}
              formatHoldingPeriod={formatHoldingPeriod}
              priceDiff={priceDiff}
              isActive={isActive({ type: 'tag', tag: 'kol' })}
              onClick={() => handleSectionClick({ type: 'tag', tag: 'kol' })}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/** Holder Bracket Card Component */
function HolderBracketCard({
  title,
  stats,
  formatHoldingPeriod,
  priceDiff,
  isActive,
  onClick
}: {
  title: string;
  stats: { totalHolding: number; totalPct: number; avgPnl: number; avgHoldingTime: number; avgCost: number; avgSell: number; trend: string; totalValue: number };
  tokenSymbol?: string;
  formatHoldingPeriod: (s: number) => string;
  priceDiff: (cost: number) => { value: number; color: string } | null;
  isActive: boolean;
  onClick: () => void;
}) {
  const costDiff = priceDiff(stats.avgCost)
  // const sellDiff = priceDiff(stats.avgSell)
  const pnlColor = stats.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg text-left transition-all ${
        isActive 
          ? 'bg-blue-500/20 border border-blue-500/50 ring-1 ring-blue-500/30' 
          : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">{title}</span>
        <div className="text-right">
          <span className="text-xs text-slate-400">{formatPercent(stats.totalPct)}</span>
          <div className="text-[10px] text-slate-500">{formatAmount(stats.totalHolding)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Total Value</span>
          <span className="text-slate-300">{formatValue(stats.totalValue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Avg PnL</span>
          <span className={pnlColor}>{stats.avgPnl >= 0 ? '+' : ''}{formatValue(stats.avgPnl)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Avg Cost</span>
          <span className="text-slate-300 flex flex-col text-right">
            {formatPrice(stats.avgCost)}
            {costDiff && <span className={`ml-1 ${costDiff.color}`}>({costDiff.value >= 0 ? '+' : ''}{costDiff.value.toFixed(0)}%)</span>}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Hold Time</span>
          <span className="text-slate-300">{formatHoldingPeriod(stats.avgHoldingTime)}</span>
        </div>
      </div>
    </button>
  )
}

/** Tag Section Card Component */
function TagSectionCard({
  title,
  icon,
  count,
  stats,
  formatHoldingPeriod,
  priceDiff,
  isActive,
  onClick
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  stats: { totalHolding: number; totalPct: number; avgPnl: number; avgHoldingTime: number; avgCost: number; avgSell: number; trend: string; totalValue: number };
  formatHoldingPeriod: (s: number) => string;
  priceDiff: (cost: number) => { value: number; color: string } | null;
  isActive: boolean;
  onClick: () => void;
}) {
  const costDiff = priceDiff(stats.avgCost)
  const sellDiff = priceDiff(stats.avgSell)
  const pnlColor = stats.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg text-left transition-all ${
        isActive 
          ? 'bg-blue-500/20 border border-blue-500/50 ring-1 ring-blue-500/30' 
          : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-white">{title}</span>
          <span className="text-xs text-slate-500">({count})</span>
        </div>
        <span className="text-xs text-slate-400">{formatPercent(stats.totalPct)} supply</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Avg PnL</span>
          <span className={pnlColor}>{stats.avgPnl >= 0 ? '+' : ''}{formatValue(stats.avgPnl)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Hold Time</span>
          <span className="text-slate-300">{formatHoldingPeriod(stats.avgHoldingTime)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Avg Cost</span>
          <span className="text-slate-300 flex flex-col text-right">
            {formatPrice(stats.avgCost)}
            {costDiff && <span className={`ml-1 ${costDiff.color}`}>({costDiff.value >= 0 ? '+' : ''}{formatValue(costDiff.value)}%)</span>}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Avg Sell</span>
          <span className="text-slate-300 flex flex-col text-right">
            {stats.avgSell > 0 ? formatPrice(stats.avgSell) : '--'}
            {sellDiff && stats.avgSell > 0 && <span className={`ml-1 ${sellDiff.color}`}>({sellDiff.value >= 0 ? '+' : ''}{formatValue(sellDiff.value)}%)</span>}
          </span>
        </div>
      </div>
    </button>
  )
}

/** Clusters Tab Component */
function ClustersTab({ 
  result, 
  chainId,
  tokenPrice,
  onClusterClick,
  onWalletClick,
  onHighlightChange
}: { 
  result: SearchResult; 
  chainId: ChainId;
  tokenPrice: number;
  onClusterClick?: (clusterId: number) => void;
  onWalletClick?: (address: string) => void;
  onHighlightChange?: (filter: string | null) => void;
}) {
  const cluster = result.cluster?.data
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(new Set())
  
  if (!cluster) return <div className="text-slate-400 text-sm">No cluster data available</div>

  // Filter to only real clusters (2+ wallets)
  const realClusters = cluster.clusterList.filter(c => c.children && c.children.length >= 2)
  
  // Get all wallets from real clusters
  const allClusterWallets = realClusters.flatMap(c => c.children)
  
  // Calculate cluster stats similar to Overview
  const calculateClusterStats = (wallets: typeof allClusterWallets) => {
    if (wallets.length === 0) return { 
      totalHolding: 0, totalPct: 0, avgPnl: 0, avgHoldingTime: 0, 
      avgCost: 0, avgSell: 0, trend: 'Transfer', totalValue: 0 
    }
    
    const totalHolding = wallets.reduce((sum, w) => sum + parseFloat(w.holdingAmount || '0'), 0)
    const totalPct = wallets.reduce((sum, w) => sum + parseFloat(w.holdingPct || '0'), 0)
    const avgPnl = wallets.reduce((sum, w) => sum + parseFloat(w.tokenPnl || '0'), 0) / wallets.length
    const avgHoldingTime = wallets.reduce((sum, w) => sum + (w.holdingAvgTime || 0), 0) / wallets.length
    
    const totalBought = wallets.reduce((sum, w) => sum + parseFloat(w.boughtValue || '0'), 0)
    const totalSold = wallets.reduce((sum, w) => sum + parseFloat(w.soldValue || '0'), 0)
    const totalHoldingVal = wallets.reduce((sum, w) => sum + parseFloat(w.holdingValue || '0'), 0)
    
    const avgCost = totalBought > 0 && totalHolding > 0 ? totalBought / totalHolding : 0
    const soldWallets = wallets.filter(w => parseFloat(w.soldValue || '0') > 0)
    const soldAmount = soldWallets.reduce((sum, w) => sum + parseFloat(w.holdingAmount || '0'), 0)
    const avgSell = totalSold > 0 && soldAmount > 0 ? totalSold / soldAmount : 0
    
    let buyCount = 0, sellCount = 0
    wallets.forEach(w => {
      const tags = flattenTags(w.tagList)
      if (tags.some(t => t.toLowerCase().includes('buy'))) buyCount++
      if (tags.some(t => t.toLowerCase().includes('sell'))) sellCount++
    })
    const trend = buyCount > sellCount ? 'Buy' : sellCount > buyCount ? 'Sell' : 'Transfer'
    
    return { totalHolding, totalPct, avgPnl, avgHoldingTime, avgCost, avgSell, trend, totalValue: totalHoldingVal }
  }
  
  const clusterStats = calculateClusterStats(allClusterWallets)
  
  // Format holding period - input is in seconds (API returns seconds)
  const formatHoldingPeriod = (seconds: number) => {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return '--'
    
    // If value seems too large (> 10 years in seconds), it might be in milliseconds
    const normalizedSeconds = seconds > 315360000 ? seconds / 1000 : seconds
    
    const days = Math.floor(normalizedSeconds / 86400)
    if (days >= 365) return `${Math.floor(days / 365)}y ${days % 365}d`
    if (days >= 30) return `${Math.floor(days / 30)}mo ${days % 30}d`
    if (days > 0) return `${days}d ${Math.floor((normalizedSeconds % 86400) / 3600)}h`
    const hours = Math.floor(normalizedSeconds / 3600)
    if (hours > 0) return `${hours}h ${Math.floor((normalizedSeconds % 3600) / 60)}m`
    const minutes = Math.floor(normalizedSeconds / 60)
    return minutes > 0 ? `${minutes}m` : '<1m'
  }
  
  // Price difference calculation
  const priceDiff = (cost: number) => {
    if (!tokenPrice || cost === 0) return null
    const diff = ((tokenPrice - cost) / cost) * 100
    return { value: diff, color: diff >= 0 ? 'text-green-400' : 'text-red-400' }
  }
  
  const costDiff = priceDiff(clusterStats.avgCost)
  const sellDiff = priceDiff(clusterStats.avgSell)
  const pnlColor = clusterStats.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'
  
  const toggleCluster = (clusterId: number) => {
    setExpandedClusters(prev => {
      const next = new Set(prev)
      if (next.has(clusterId)) {
        next.delete(clusterId)
        // Clear highlight when closing
        onHighlightChange?.(null)
      } else {
        // Clear previous and add new
        next.clear()
        next.add(clusterId)
        // Highlight this cluster's nodes
        const clusterData = result.cluster?.data?.clusterList?.find(c => c.clusterId === clusterId)
        if (clusterData) {
          onHighlightChange?.(JSON.stringify({ type: 'cluster', clusterId: clusterData.rank }))
        }
      }
      return next
    })
  }
  
  return (
    <div className="space-y-4">
      {/* Cluster Performance Summary - same style as Overview */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Cluster Performance</h3>
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCircleNodes} className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">{realClusters.length} Clusters</span>
              <span className="text-xs text-slate-500">({allClusterWallets.length} wallets)</span>
            </div>
            <span className="text-xs text-slate-400">{formatPercent(clusterStats.totalPct)} supply</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Avg PnL</span>
              <span className={pnlColor}>{clusterStats.avgPnl >= 0 ? '+' : ''}{formatValue(clusterStats.avgPnl)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hold Time</span>
              <span className="text-slate-300">{formatHoldingPeriod(clusterStats.avgHoldingTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Avg Cost</span>
              <span className="text-slate-300 flex flex-col text-right">
                {formatPrice(clusterStats.avgCost)}
                {costDiff && <span className={`ml-1 ${costDiff.color}`}>({costDiff.value >= 0 ? '+' : ''}{costDiff.value.toFixed(1)}%)</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Avg Sell</span>
              <span className="text-slate-300 flex flex-col text-right">
                {clusterStats.avgSell > 0 ? formatPrice(clusterStats.avgSell) : '--'}
                {sellDiff && clusterStats.avgSell > 0 && <span className={`ml-1 ${sellDiff.color}`}>({sellDiff.value >= 0 ? '+' : ''}{sellDiff.value.toFixed(1)}%)</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Value</span>
              <span className="text-slate-300">{formatValue(clusterStats.totalValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Trend</span>
              <span className={clusterStats.trend === 'Buy' ? 'text-green-400' : clusterStats.trend === 'Sell' ? 'text-red-400' : 'text-slate-300'}>{clusterStats.trend}</span>
            </div>
          </div>
        </div>
      </div>

      {/* All Clusters List - only real clusters (2+ wallets) */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">All Clusters</h3>
        {realClusters.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-4">No clusters found</div>
        ) : (
          <div className="space-y-2">
            {realClusters.map((c) => {
              const pnlPct = parseFloat(c.tokenPnlPct || '0')
              const clusterPnlColor = pnlPct >= 0 ? 'text-green-400' : 'text-red-400'
              const clusterColor = `hsl(${(c.rank * 137.508) % 360}, 70%, 50%)`
              const actualAddressCount = c.children?.length || 0
              const clusterTotalValue = c.children?.reduce((sum, w) => sum + parseFloat(w.holdingValue || '0'), 0) || 0
              const isExpanded = expandedClusters.has(c.clusterId)
              
              return (
                <div key={c.clusterId} className="bg-slate-800/50 rounded-lg overflow-hidden">
                  {/* Cluster Header */}
                  <button 
                    onClick={() => toggleCluster(c.clusterId)}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <FontAwesomeIcon 
                        icon={faCircleNodes} 
                        className="w-5 h-5"
                        style={{ color: clusterColor }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Cluster {c.rank}</span>
                          <span className="text-xs text-slate-500">{actualAddressCount} wallets • {formatValue(clusterTotalValue)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatPercent(c.holdingPct)}</div>
                        <div className={`text-xs ${clusterPnlColor}`}>
                          {pnlPct >= 0 ? '+' : ''}{(pnlPct * 100).toFixed(1)}%
                        </div>
                      </div>
                      <FontAwesomeIcon 
                        icon={faChevronRight} 
                        className={`w-3 h-3 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </button>
                  
                  {/* Expanded Wallet List */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 p-2 space-y-1">
                      {c.children.map((wallet) => (
                        <WalletRow 
                          key={wallet.address}
                          wallet={{ ...wallet, clusterRank: c.rank, clusterName: c.clusterName, clusterSize: c.children.length }}
                          chainId={chainId}
                          onClick={() => onWalletClick?.(wallet.address)}
                        />
                      ))}
                      <button
                        onClick={() => onClusterClick?.(c.clusterId)}
                        className="w-full text-center py-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-700/30 rounded transition-colors"
                      >
                        View Cluster Details
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/** Wallets Tab Component */
function WalletsTab({ 
  result, 
  sortBy,
  sortAsc,
  filter,
  chainId,
  hiddenWallets,
  highlightedWallets,
  onSortChange,
  onSortDirectionChange,
  onFilterChange,
  onWalletClick,
  onWalletHide,
  onWalletHighlight
}: { 
  result: SearchResult;
  sortBy: 'holding' | 'pnl' | 'value';
  sortAsc: boolean;
  filter: 'all' | 'whale' | 'exchange' | 'contract';
  chainId: ChainId;
  hiddenWallets: Set<string>;
  highlightedWallets: Set<string>;
  onSortChange: (sort: 'holding' | 'pnl' | 'value') => void;
  onSortDirectionChange: () => void;
  onFilterChange: (filter: 'all' | 'whale' | 'exchange' | 'contract') => void;
  onWalletClick: (address: string) => void;
  onWalletHide: (address: string, hidden: boolean) => void;
  onWalletHighlight: (address: string, highlighted: boolean) => void;
}) {
  const cluster = result.cluster?.data
  
  if (!cluster?.clusterList) return <div className="text-slate-400 text-sm">No wallet data available</div>

  let allWallets = cluster.clusterList.flatMap(c => 
    c.children.map(w => ({ ...w, clusterRank: c.rank, clusterName: c.clusterName, clusterSize: c.children.length }))
  )
  
  // Apply filter
  if (filter === 'whale') {
    allWallets = allWallets.filter(w => {
      const tags = flattenTags(w.tagList)
      return tags.some(t => t.toLowerCase().includes('whale'))
    })
  } else if (filter === 'exchange') {
    allWallets = allWallets.filter(w => getExchangeInfo(w.exchange).isExchange)
  } else if (filter === 'contract') {
    allWallets = allWallets.filter(w => w.contract)
  }
  
  // Apply sort
  allWallets.sort((a, b) => {
    let comparison = 0
    if (sortBy === 'holding') {
      comparison = parseFloat(b.holdingPct) - parseFloat(a.holdingPct)
    } else if (sortBy === 'pnl') {
      comparison = parseFloat(b.tokenPnlPct || '0') - parseFloat(a.tokenPnlPct || '0')
    } else if (sortBy === 'value') {
      comparison = parseFloat(b.holdingValue) - parseFloat(a.holdingValue)
    }
    return sortAsc ? -comparison : comparison
  })
  
  return (
    <div className="space-y-2">
      {/* Filter and Sort Controls - Icon-based */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {/* Filter Buttons */}
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-transparent text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="All Wallets"
          >
            All
          </button>
          <button
            onClick={() => onFilterChange('whale')}
            className={`p-1.5 rounded transition-colors ${
              filter === 'whale' 
                ? 'bg-transparent text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="Whales Only"
          >
            <img src="./icon/whale.min.svg" alt="Whale" className="w-4 h-4" style={{ filter: filter === 'whale' ? 'brightness(10)' : '' }} />
          </button>
          <button
            onClick={() => onFilterChange('exchange')}
            className={`p-1.5 rounded transition-colors ${
              filter === 'exchange' 
                ? 'bg-transparent text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="Exchanges Only"
          >
            <FontAwesomeIcon icon={faBuildingColumns} className="w-4 h-4" />
          </button>
          <button
            onClick={() => onFilterChange('contract')}
            className={`p-1.5 rounded transition-colors ${
              filter === 'contract' 
                ? 'bg-transparent text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="Contracts Only"
          >
            <FontAwesomeIcon icon={faFileLines} className="w-4 h-4" />
          </button>
        </div>
        
        {/* Sort Buttons */}
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 ml-auto">
          <button
            onClick={() => onSortChange('holding')}
            className={`px-2 py-1.5 rounded text-xs font-bold transition-colors ${
              sortBy === 'holding' 
                ? 'bg-transparent text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="Sort by Holding %"
          >
            %
          </button>
          <button
            onClick={() => onSortChange('value')}
            className={`px-2 py-1.5 rounded text-xs font-bold transition-colors ${
              sortBy === 'value' 
                ? 'bg-transparent text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="Sort by Value"
          >
            $
          </button>
          <button
            onClick={() => onSortChange('pnl')}
            className={`px-2 py-1.5 rounded text-xs font-bold transition-colors ${
              sortBy === 'pnl' 
                ? 'bg-transparent text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="Sort by PnL"
          >
            PnL
          </button>
          <button
            onClick={onSortDirectionChange}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title={sortAsc ? 'Ascending' : 'Descending'}
          >
            <FontAwesomeIcon 
              icon={sortAsc ? faArrowUpWideShort : faArrowDownWideShort} 
              className="w-4 h-4" 
            />
          </button>
        </div>
      </div>
      
      {/* Wallet List */}
      <div className="space-y-1.5">
        {allWallets.length === 0 ? (
          <div className="text-slate-400 text-sm text-center py-4">No wallets</div>
        ) : (
          allWallets.map((wallet) => (
            <WalletRow 
              key={wallet.address} 
              wallet={wallet} 
              chainId={chainId}
              isHidden={hiddenWallets.has(wallet.address)}
              isHighlighted={highlightedWallets.has(wallet.address)}
              onClick={() => onWalletClick(wallet.address)}
              onHide={(hidden) => onWalletHide(wallet.address, hidden)}
              onHighlight={(highlighted) => onWalletHighlight(wallet.address, highlighted)}
            />
          ))
        )}
      </div>
    </div>
  )
}

/** Metric Card Component */
function MetricCard({ 
  label, 
  value, 
  className = '',
  compact = false 
}: { 
  label: string; 
  value: string; 
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`bg-slate-800/50 rounded-lg ${compact ? 'p-2' : 'p-4'}`}>
      <div className={`text-slate-400 ${compact ? 'text-xs mb-0.5' : 'text-sm mb-1'}`}>{label}</div>
      <div className={`font-bold ${className} ${compact ? 'text-sm' : 'text-lg'}`}>{value}</div>
    </div>
  )
}
