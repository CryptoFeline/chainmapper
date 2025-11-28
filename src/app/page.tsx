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
import BubbleMap, { BubbleMapRef, BubbleNode, HighlightFilter } from '@/components/BubbleMap'
import { formatAmount, formatValue, formatPercent, truncateAddress, formatRelativeTime, formatPrice, flattenTags, formatTag } from '@/utils/formatters'
import { getAddressExplorerUrl } from '@/utils/chainMapping'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faHexagonNodes, 
  faCopy, 
  faArrowUpRightFromSquare, 
  faBars, 
  faChevronRight,
  faLayerGroup,
  faGem,
  faWallet,
  faChartPie,
  faBuildingColumns,
  faFileLines,
  faMicrophoneLines,
  faToiletPaper,
  faSeedling,
  faLeaf,
  faCrown,
  faGavel,
  faProjectDiagram,
  faTriangleExclamation,
  faXmark,
  faArrowUpWideShort,
  faArrowDownWideShort,
  faCircleNodes,
  faCheck,
  faClock,
  faChartLine,
  faArrowTrendUp,
  faArrowTrendDown,
  faSackDollar,
  faScaleBalanced,
  faUsers,
  // faTags,
  faRobot,
  faBurger,
  faFish,
  faGlasses,
  faCode,
  faCrosshairs,
  faClockRotateLeft,
  faDroplet,
  faStar,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons'

/** Chain configuration with logos and explorer URLs */
const CHAIN_OPTIONS: Array<{ id: ChainId; name: string; logo: string; explorer: string }> = [
  { id: 1, name: 'Ethereum', logo: 'https://static.coinall.ltd/cdn/wallet/logo/ETH-20220328.png', explorer: 'https://etherscan.io/token/' },
  { id: 56, name: 'BSC', logo: 'https://static.coinall.ltd/cdn/wallet/logo/bnb_5000_new.png', explorer: 'https://bscscan.com/token/' },
  { id: 501, name: 'Solana', logo: 'https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png', explorer: 'https://solscan.io/token/' },
  { id: 8453, name: 'Base', logo: 'https://static.coinall.ltd/cdn/wallet/logo/base_20800_new.png', explorer: 'https://basescan.org/token/' },
]

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
            {/* Token with chain badge - hidden on mobile */}
            <div className="relative hidden sm:block">
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
            </div>

            <div className="hidden md:block">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">
                  {result.tokenInfo?.data?.tokenSymbol || '???'}
                </span>
                <span className="text-slate-400 text-xs font-mono">
                  {truncateAddress(tokenAddress)}
                </span>
                <button 
                  onClick={copyAddress}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                  title={copied ? 'Copied!' : 'Copy address'}
                >
                  <FontAwesomeIcon icon={faCopy} className={`w-3 h-3 ${copied ? 'text-green-400' : 'text-slate-400'}`} />
                </button>
                <button 
                  onClick={openExplorer}
                  className="hover:bg-slate-700 rounded transition-colors"
                  title="View on explorer"
                >
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3 h-3 text-slate-400" />
                </button>
                <button 
                  onClick={toggleFavorite}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <FontAwesomeIcon 
                    icon={isFavorite ? faStar : faStarRegular} 
                    className={`w-3.5 h-3.5 ${isFavorite ? 'text-yellow-500' : 'text-slate-400'}`} 
                  />
                </button>
              </div>
              <div className="flex justify-between items-center gap-2 text-xs">
                <span className="font-medium">{formatPrice(result.tokenInfo?.data?.price || 0)}</span>
                {result.tokenInfo?.data?.change && (
                  <span className={parseFloat(result.tokenInfo.data.change) >= 0 ? 'text-green-400' : 'text-red-400'}>
                    <span className='text-slate-400'>24H: </span>
                    {parseFloat(result.tokenInfo.data.change) >= 0 ? '+' : ''}
                    {(parseFloat(result.tokenInfo.data.change) * 100).toFixed(2)}%
                  </span>
                )}
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
                  onSortChange={(sort) => setWalletSortBy(sort)}
                  onSortDirectionChange={() => setWalletSortAsc(!walletSortAsc)}
                  onFilterChange={(f) => setWalletFilter(f)}
                  onWalletClick={(address) => {
                    bubbleMapRef.current?.highlightNode(address)
                    setWalletDetailAddress(address)
                    // Just highlight and open modal, BubbleMap will handle selectedNode
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Token Info Bar (visible on small screens) */}
      <div className="md:hidden flex-shrink-0 p-2 border-t border-slate-700/50 bg-slate-900/95 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            {result.tokenInfo?.data?.tokenLogoUrl && (
              <img 
                src={result.tokenInfo.data.tokenLogoUrl} 
                alt=""
                className="w-10 h-10 rounded-full"
              />
            )}
            <img 
              src={selectedChainConfig.logo} 
              alt=""
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-slate-900"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-sm">{result.tokenInfo?.data?.tokenName} <span className="text-xs text-slate-500">(${result.tokenInfo?.data?.tokenSymbol})</span></span>
            <span className="text-xs text-slate-300 font-mono">{truncateAddress(tokenAddress)}
                <button onClick={copyAddress} >
                <FontAwesomeIcon icon={faCopy} className={`mt-1 p-0.5 w-3 h-3 ${copied ? 'text-green-400' : 'text-slate-300'}`} />
                </button>
                <button onClick={openExplorer} >
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="mt-1 p-0.5 w-3 h-3 text-slate-300" />
                </button>
            </span>
          </div>
          
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium">{formatPrice(result.tokenInfo?.data?.price || 0)}</span>
          {result.tokenInfo?.data?.change && (
                  <span className={parseFloat(result.tokenInfo.data.change) >= 0 ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
                    <span className='text-xs text-slate-500'>24H: </span>
                    {parseFloat(result.tokenInfo.data.change) >= 0 ? '+' : ''}
                    {(parseFloat(result.tokenInfo.data.change) * 100).toFixed(2)}%
                  </span>
                )}
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

  const riskLevel = parseFloat(cluster.rugpullProbability || '0')
  const riskColor = riskLevel > 0.7 ? 'text-red-400' : riskLevel > 0.3 ? 'text-yellow-400' : 'text-green-400'
  
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
      {/* Risk Metrics */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Risk Analysis</h3>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard 
            label="Rugpull Risk" 
            value={formatPercent(cluster.rugpullProbability)} 
            className={riskColor}
            compact
          />
          <MetricCard 
            label="Top 100" 
            value={formatPercent(cluster.top100Holding)} 
            compact
          />
          <MetricCard 
            label="Concentration" 
            value={formatPercent(cluster.clusterConcentration)} 
            compact
          />
          <MetricCard 
            label="Fresh Wallets" 
            value={formatPercent(cluster.freshWallets)} 
            compact
          />
        </div>
      </div>

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
  onSortChange,
  onSortDirectionChange,
  onFilterChange,
  onWalletClick
}: { 
  result: SearchResult;
  sortBy: 'holding' | 'pnl' | 'value';
  sortAsc: boolean;
  filter: 'all' | 'whale' | 'exchange' | 'contract';
  chainId: ChainId;
  onSortChange: (sort: 'holding' | 'pnl' | 'value') => void;
  onSortDirectionChange: () => void;
  onFilterChange: (filter: 'all' | 'whale' | 'exchange' | 'contract') => void;
  onWalletClick: (address: string) => void;
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
              onClick={() => onWalletClick(wallet.address)}
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

/** Generic tags that shouldn't be used as wallet labels */
const GENERIC_TAGS = [
  'whale', 'whales', 'topholder', 'top holder', 'freshwallet', 'fresh wallet', 
  'bundle', 'contract', 'exchange', 'kol', 'paperhands', 'paper hands',
  'mevbot', 'mevbot_sandwich', 'tradingbot', 'sniper', 'bundler', 'insider',
  'smartmoney', 'smart money', 'dev', 'liquiditypool', 'liquidity pool',
  'suspectedphishingwallet', 'phishing', 'fresh', 'trading bot user', 'authority',
  'protocol', 'suspicious', 'diamond', 'diamondHands'
]

/** Parse tagList to extract tag info with names (mirrors BubbleMap logic) */
interface TagInfo {
  tag: string
  name?: string
  attr?: string
  logoUrl?: string
}

function parseTagList(tagList: unknown[][]): TagInfo[] {
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

/** Get wallet display label from exchange name, tag names, or meaningful tags */
function getWalletLabel(wallet: WalletWithCluster): string | null {
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
      if (GENERIC_TAGS.some(g => lowerTag.includes(g))) continue
      return t.name
    }
  }
  
  return null
}

/** Deduplicate and normalize tags */
function deduplicateTags(tags: string[], wallet: WalletWithCluster): { icons: React.ReactNode[]; textTags: string[] } {
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
      icons.push(<FontAwesomeIcon key="sandwich" icon={faBurger} className="w-3 h-3" style={{ color: '#ca3f64' }}  title="Sandwich Bot" data-tooltip="Sandwich Bot" />)
      seenTypes.add('mevbot_sandwich')
      seenTypes.add('mevbot')
      return
    }
    
    // MEV Bot
    if (lowerTag.includes('mevbot') && !seenTypes.has('mevbot')) {
      icons.push(<FontAwesomeIcon key="mevbot" icon={faRobot} className="w-3 h-3" style={{ color: '#ca3f64' }}  title="MEV Bot" data-tooltip="MEV Bot" />)
      seenTypes.add('mevbot')
      return
    }
    
    // Phishing
    if ((lowerTag.includes('phishing') || lowerTag.includes('suspectedphishing')) && !seenTypes.has('phishing')) {
      icons.push(<FontAwesomeIcon key="phishing" icon={faFish} className="w-3 h-3" style={{ color: '#ca3f64' }} title="Phishing" data-tooltip="Suspected Phishing" />)
      seenTypes.add('phishing')
      return
    }

    // Suspicious
    if (lowerTag.includes('suspicious') && !seenTypes.has('suspicious')) {
      icons.push(<FontAwesomeIcon key="suspicious" icon={faTriangleExclamation} className="w-3 h-3" style={{ color: '#ca3f64' }} title="Suspicious" data-tooltip="Suspicious Wallet" />)
      seenTypes.add('suspicious')
      return
    }

    // Authority
    if ((lowerTag.includes('authority')) && !seenTypes.has('authority')) {
      icons.push(<FontAwesomeIcon key="authority" icon={faGavel} className="w-3 h-3 text-slate-400" title="Authority" data-tooltip="Authority Wallet" />)
      seenTypes.add('authority')
      return
    }

    // Protocol
    if ((lowerTag.includes('protocol')) && !seenTypes.has('protocol')) {
      icons.push(<FontAwesomeIcon key="protocol" icon={faProjectDiagram} className="w-3 h-3 text-slate-400" title="Protocol" data-tooltip="Protocol Wallet" />)
      seenTypes.add('protocol')
      return
    }
    
    // Trading Bot
    if (lowerTag.includes('tradingbot') && !seenTypes.has('tradingbot')) {
      icons.push(<FontAwesomeIcon key="tradingbot" icon={faRobot} className="w-3 h-3 " style={{ color: '#ca3f64' }}  title="Trading Bot" data-tooltip="Trading Bot" />)
      seenTypes.add('tradingbot')
      return
    }

    // Trading Bot User
    if (lowerTag.includes('trading bot user') && !seenTypes.has('trading bot user')) {
      icons.push(<FontAwesomeIcon key="tradingbotuser" icon={faRobot} className="w-3 h-3 " style={{ color: '#ca3f64' }}  title="Trading Bot User" data-tooltip="Trading Bot User" />)
      seenTypes.add('trading bot user')
      return
    }
    
    // Bundler
    if (lowerTag.includes('bundle') && !seenTypes.has('bundle')) {
      icons.push(<FontAwesomeIcon key="bundle" icon={faLayerGroup} className="w-3 h-3 text-amber-400" title="Bundler" data-tooltip="Bundle Wallet" />)
      seenTypes.add('bundle')
      return
    }
    
    // Sniper
    if (lowerTag.includes('sniper') && !seenTypes.has('sniper')) {
      icons.push(<FontAwesomeIcon key="sniper" icon={faCrosshairs} className="w-3 h-3 text-amber-400" title="Sniper" data-tooltip="Sniper Wallet" />)
      seenTypes.add('sniper')
      return
    }
    
    // Insider
    if (lowerTag.includes('insider') && !seenTypes.has('insider')) {
      icons.push(<FontAwesomeIcon key="insider" icon={faClockRotateLeft} className="w-3 h-3 text-slate-400" title="Insider" data-tooltip="Insider Wallet" />)
      seenTypes.add('insider')
      return
    }
    
    // Smart Money
    if (lowerTag.includes('smartmoney') && !seenTypes.has('smartmoney')) {
      icons.push(<FontAwesomeIcon key="smartmoney" icon={faGlasses} className="w-3 h-3 text-slate-400" title="Smart Money" data-tooltip="Smart Money" />)
      seenTypes.add('smartmoney')
      return
    }
    
    // Dev
    if (lowerTag === 'dev' && !seenTypes.has('dev')) {
      icons.push(<FontAwesomeIcon key="dev" icon={faCode} className="w-3 h-3 text-slate-400" title="Dev" data-tooltip="Dev Wallet" />)
      seenTypes.add('dev')
      return
    }
    
    // Liquidity Pool
    if (lowerTag.includes('liquiditypool') && !seenTypes.has('liquiditypool')) {
      icons.push(<FontAwesomeIcon key="lp" icon={faDroplet} className="w-3 h-3 text-blue-400" title="Liquidity Pool" data-tooltip="Liquidity Pool" />)
      seenTypes.add('liquiditypool')
      return
    }
    
    // Check for whale variants
    if (lowerTag.includes('whale') && !seenTypes.has('whale')) {
      icons.push(
        <img 
          key="whale" 
          src="/icon/whale.min.svg" 
          alt="Whale" 
          className="w-3 h-3 text-slate-400" 
          title="Whale"
          data-tooltip="Whale Wallet"
        />
      )
      seenTypes.add('whale')
      return
    }
    
    // Check for fresh wallet
    if (lowerTag.includes('fresh') && !seenTypes.has('fresh')) {
      icons.push(<FontAwesomeIcon key="fresh" icon={faSeedling} className="w-3 h-3 text-slate-400" title="Fresh Wallet" data-tooltip="Fresh Wallet" />)
      seenTypes.add('fresh')
      return
    }
    
    // Check for top holder
    if (lowerTag.includes('top') && !seenTypes.has('top')) {
      icons.push(<FontAwesomeIcon key="top" icon={faCrown} className="w-3 h-3 text-slate-400" title="Top Holder" data-tooltip="Top 10% Holder" />)
      seenTypes.add('top')
      return
    }

    // Check for paper hands
    if (lowerTag.includes('paper') && !seenTypes.has('paper')) {
      icons.push(<FontAwesomeIcon key="paper" icon={faToiletPaper} className="w-3 h-3 text-slate-400" title="Paper Hands" data-tooltip="Paper Hand" />)
      seenTypes.add('paper')
      return
    }

    // Check for diamond hands
    if (lowerTag.includes('diamond') || lowerTag.includes('diamondHands') && !seenTypes.has('diamond')) {
      icons.push(<FontAwesomeIcon key="diamond" icon={faGem} className="w-3 h-3 text-primary-400" title="Diamond Hands" data-tooltip="Diamond Hands" />)
      seenTypes.add('diamond')
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

/** Safely extract exchange info from wallet */
function getExchangeInfo(exchange: unknown): { isExchange: boolean; info: { name: string; attr?: string; logoUrl: string } | null } {
  // Handle array of exchange objects
  if (Array.isArray(exchange) && exchange.length > 0) {
    const first = exchange[0]
    if (first && typeof first === 'object') {
      const obj = first as { name?: string; attr?: string; logoUrl?: string }
      // Use name, or attr as fallback for display name
      const displayName = String(obj.name || obj.attr || '')
      return { 
        isExchange: true, 
        info: { name: displayName, attr: obj.attr ? String(obj.attr) : undefined, logoUrl: String(obj.logoUrl || '') }
      }
    }
    return { isExchange: true, info: null }
  }
  
  // Handle single exchange object (unexpected but possible from API)
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

/** Extract KOL info from wallet tagList */
function getKolInfo(wallet: { kol: boolean; tagList?: string[][] }): { 
  isKol: boolean
  name?: string
  image?: string
  link?: string
} {
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

/** Wallet Row Component */
function WalletRow({ wallet, onClick, chainId = 1 }: { wallet: WalletWithCluster; onClick?: () => void; chainId?: ChainId }) {
  const [copied, setCopied] = useState(false)
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
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-left ${
        isRealCluster ? 'bg-slate-800/50' : 'bg-slate-800/30'
      }`}
      style={isRealCluster ? { 
        border: `1px solid ${clusterColor}`,
        borderLeftWidth: '3px',
        boxShadow: `0 0 8px ${clusterColor}40`
      } : undefined}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Type icon or exchange/KOL image */}
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
          {isExchange && exchangeInfo?.logoUrl ? (
            <img src={exchangeInfo.logoUrl} alt={exchangeInfo.name || 'Exchange'} className="w-5 h-5 rounded-full" title={exchangeInfo.name} />
          ) : isExchange ? (
            <FontAwesomeIcon icon={faBuildingColumns} className="w-4 h-4 text-slate-400" title="Exchange" />
          ) : kolInfo.isKol && kolInfo.image ? (
            <img src={kolInfo.image} alt={kolInfo.name || 'KOL'} className="w-5 h-5 rounded-full" title={kolInfo.name} />
          ) : wallet.contract ? (
            <FontAwesomeIcon icon={faFileLines} className="w-4 h-4 text-slate-400" title="Contract" />
          ) : kolInfo.isKol ? (
            <FontAwesomeIcon icon={faMicrophoneLines} className="w-4 h-4 text-yellow-400" title="KOL" />
          ) : (
            <FontAwesomeIcon icon={faWallet} className="w-4 h-4 text-slate-400" />
          )}
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
  )
}

/** Extended wallet type with cluster info */
interface WalletWithCluster {
  address: string;
  rank: number;
  holdingPct: string;
  holdingAmount: string;
  holdingValue: string;
  holdingAvgTime: number;
  lastActive: number;
  tagList: string[][];
  contract: boolean;
  exchange: boolean | { name: string; attr?: string; logoUrl: string }[];
  kol: boolean;
  tokenPnl?: string;
  tokenPnlPct?: string;
  boughtValue?: string;
  avgCost?: string;
  soldValue?: string;
  avgSell?: string;
  clusterRank: number;
  clusterName: string;
  clusterSize: number;
}

/** Wallet Detail Modal - Comprehensive wallet information */
function WalletDetailModal({ 
  wallet, 
  chainId, 
  tokenSymbol,
  priceChange,
  onClose 
}: { 
  wallet: WalletWithCluster; 
  chainId: ChainId;
  tokenSymbol: string;
  priceChange: number;
  onClose: () => void;
}) {
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
  // const tags = flattenTags(wallet.tagList)
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
          
          {/* Tags */}
          {/* {tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <FontAwesomeIcon icon={faTags} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                <h4 className="text-xs sm:text-sm font-semibold text-white">Tags</h4>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {tags.map((tag, i) => (
                  <span key={i} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[10px] sm:text-xs text-slate-300">
                    {formatTag(tag)}
                  </span>
                ))}
              </div>
            </div>
          )} */}
          
          {/* Cluster Association */}
          {wallet.clusterRank > 0 && (
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

/** Cluster Detail Modal - Comprehensive cluster information */
function ClusterDetailModal({ 
  cluster, 
  chainId, 
  tokenSymbol,
  onClose,
  onWalletClick
}: { 
  cluster: { 
    clusterId: number;
    rank: number;
    clusterName: string;
    holdingPct: string;
    addressCount: number;
    holdingAmount?: string;
    holdingValue?: string;
    tokenPnl?: string;
    tokenPnlPct?: string;
    boughtValue?: string;
    avgCost?: string;
    soldValue?: string;
    avgSell?: string;
    holdingAvgTime?: string;
    lastActive?: number;
    children: WalletWithCluster[];
  }; 
  chainId: ChainId;
  tokenSymbol: string;
  onClose: () => void;
  onWalletClick: (address: string) => void;
}) {
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
