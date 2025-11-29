'use client'

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useState } from 'react'
import * as d3 from 'd3'
import type { ClusterResponse } from '@/types/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faBuildingColumns, 
  faFileLines, 
  faMicrophoneLines, 
  faRobot,
  faBurger,
  faFish,
  faGlasses,
  faCode,
  faCrosshairs,
  faLayerGroup,
  faClockRotateLeft,
  faDroplet
} from '@fortawesome/free-solid-svg-icons'
import { renderToStaticMarkup } from 'react-dom/server'
import { truncateAddress, formatPercent, formatValue } from '@/utils/formatters'

/** Tag info with optional object data */
export interface TagInfo {
  tag: string
  name?: string
  attr?: string
  logoUrl?: string
  // KOL-specific fields
  displayName?: string      // KOL display name (e.g., "CowboyBNB")
  kolTwitterImage?: string  // KOL Twitter profile image URL
  kolImage?: string         // KOL fallback image
  kolLink?: string          // KOL social link (e.g., Twitter/X URL)
}

// Available SVG icons in /public/icon/ folder that can be matched by name
const AVAILABLE_NAME_ICONS: Record<string, string> = {
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
function matchNameToIcon(name: string | undefined): string | undefined {
  if (!name) return undefined
  const nameLower = name.toLowerCase()
  
  // Direct match first
  if (AVAILABLE_NAME_ICONS[nameLower]) {
    return AVAILABLE_NAME_ICONS[nameLower]
  }
  
  // Partial match - check if name contains any of the keys
  for (const [key, path] of Object.entries(AVAILABLE_NAME_ICONS)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return path
    }
  }
  
  return undefined
}

/** Node data for D3 simulation */
export interface BubbleNode extends d3.SimulationNodeDatum {
  id: string
  address: string
  holdingPct: number
  rank: number // Overall holder rank (1 = largest holder)
  clusterRank: number
  clusterSize: number // Number of wallets in cluster
  tags: string[][]
  tagInfos: TagInfo[] // Parsed tag info with names
  isContract: boolean
  isExchange: boolean
  isKol: boolean
  // Special tag types that override node icon
  isMevBot: boolean
  isMevBotSandwich: boolean
  isLiquidityPool: boolean
  isTradingBot: boolean
  isPhishing: boolean
  isBundler: boolean
  isSniper: boolean
  isSmartMoney: boolean
  isDev: boolean
  isInsider: boolean
  exchangeLogo?: string
  exchangeName?: string
  nameIconPath?: string // Path to matched SVG icon based on name
  value?: number
  displayName?: string // The name to show (from exchange or tag)
  displayAttr?: string // Additional attribute
  // KOL-specific data
  kolName?: string      // KOL username (name or displayName)
  kolImage?: string     // KOL image URL (kolTwitterImage or image)
  kolLink?: string      // KOL social link
}

/** Link data for D3 simulation */
export interface BubbleLink extends d3.SimulationLinkDatum<BubbleNode> {
  source: string | BubbleNode
  target: string | BubbleNode
  solid: boolean
}

/** Ref methods exposed to parent */
export interface BubbleMapRef {
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  highlightNode: (nodeId: string) => void
  highlightByFilter: (filter: HighlightFilter | null) => void
}

/** Highlight filter for dimming non-matching nodes */
export type HighlightFilter = 
  | { type: 'rank'; min: number; max: number }  // Top X-Y holders
  | { type: 'tag'; tag: string }                 // By tag (whale, exchange, etc.)
  | { type: 'cluster'; clusterId: number }       // By cluster
  | { type: 'hideWallet'; address: string }      // Hide a specific wallet (deprecated, use hideWallets)
  | { type: 'hideWallets'; addresses: string[] } // Hide multiple wallets
  | { type: 'highlightWallet'; address: string } // Highlight a specific wallet

interface BubbleMapProps {
  data: ClusterResponse
  onNodeSelect?: (node: BubbleNode | null) => void
  onNodeClick?: (node: BubbleNode) => void
  selectedNode?: BubbleNode | null
  highlightFilter?: HighlightFilter | null
}

/** Parse tagList to extract tag info with names */
function parseTagList(tagList: unknown[][]): TagInfo[] {
  const result: TagInfo[] = []
  if (!tagList || !Array.isArray(tagList)) return result
  
  tagList.forEach(tagGroup => {
    if (!Array.isArray(tagGroup)) return
    
    let currentTag: string | null = null
    let currentInfo: { 
      name?: string
      attr?: string
      logoUrl?: string
      displayName?: string
      kolTwitterImage?: string
      kolImage?: string
      kolLink?: string
    } = {}
    
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
        const obj = item as { 
          name?: string
          attr?: string
          logoUrl?: string
          displayName?: string
          kolTwitterImage?: string
          image?: string
          link?: string
        }
        currentInfo = {
          name: obj.name,
          attr: obj.attr,
          logoUrl: obj.logoUrl,
          // KOL-specific fields
          displayName: obj.displayName,
          kolTwitterImage: obj.kolTwitterImage,
          kolImage: obj.image,
          kolLink: obj.link
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

/** Check if any tag matches a pattern */
function hasTag(tagInfos: TagInfo[], ...patterns: string[]): boolean {
  return tagInfos.some(t => 
    patterns.some(p => t.tag.toLowerCase().includes(p.toLowerCase()))
  )
}

/** Get tag info by pattern */
function getTagInfo(tagInfos: TagInfo[], ...patterns: string[]): TagInfo | undefined {
  return tagInfos.find(t => 
    patterns.some(p => t.tag.toLowerCase().includes(p.toLowerCase()))
  )
}

/** Transform API cluster data to D3 nodes and links */
function transformClusterData(data: ClusterResponse): { nodes: BubbleNode[]; links: BubbleLink[] } {
  const nodes: BubbleNode[] = []
  const nodeMap = new Map<string, BubbleNode>()
  
  if (!data?.data?.clusterList) {
    return { nodes: [], links: [] }
  }

  // Process clusters
  data.data.clusterList.forEach((cluster, clusterIndex) => {
    // If cluster has only 1 wallet, it's not really a cluster - mark as rank 0
    const isRealCluster = cluster.children && cluster.children.length > 1
    const clusterRank = isRealCluster ? (clusterIndex + 1) : 0
    
    if (cluster.children) {
      cluster.children.forEach((wallet) => {
        const holdingPct = parseFloat(wallet.holdingPct || '0')
        const value = parseFloat(wallet.holdingValue || '0')
        
        // Parse all tag info including objects with names
        const tagInfos = parseTagList(wallet.tagList || [])
        
        // Extract exchange info from exchange field or exchange tag
        let exchangeLogo: string | undefined
        let exchangeName: string | undefined
        let exchangeAttr: string | undefined
        
        // Check wallet.exchange first
        if (Array.isArray(wallet.exchange) && wallet.exchange.length > 0) {
          exchangeLogo = wallet.exchange[0]?.logoUrl
          exchangeName = wallet.exchange[0]?.name
          exchangeAttr = wallet.exchange[0]?.attr
        }
        
        // Also check for exchange tag with data
        const exchangeTag = getTagInfo(tagInfos, 'exchange')
        if (exchangeTag) {
          if (exchangeTag.logoUrl && !exchangeLogo) exchangeLogo = exchangeTag.logoUrl
          if (exchangeTag.name && !exchangeName) exchangeName = exchangeTag.name
          if (exchangeTag.attr && !exchangeAttr) exchangeAttr = exchangeTag.attr
        }
        
        // Determine display name - priority: exchange name > liquidityPool name > other tag names
        let displayName: string | undefined = exchangeName
        let displayAttr: string | undefined = exchangeAttr
        
        // Check for liquidityPool with name
        const lpTag = getTagInfo(tagInfos, 'liquidityPool')
        if (lpTag?.name && !displayName) {
          displayName = lpTag.name
        }
        
        // Check other tags for names (but not generic ones)
        if (!displayName) {
          const genericTags = ['whale', 'topholder', 'fresh', 'paperhands', 'bundle', 'contract', 'exchange', 'kol', 'mevbot', 'tradingbot', 'sniper', 'bundler', 'insider', 'smartmoney', 'dev']
          for (const t of tagInfos) {
            if (t.name && !genericTags.some(g => t.tag.toLowerCase().includes(g))) {
              displayName = t.name
              break
            }
          }
        }
        
        // Detect special tag types
        const isMevBotSandwich = hasTag(tagInfos, 'mevBot_sandwich')
        const isMevBot = !isMevBotSandwich && hasTag(tagInfos, 'mevBot')
        const isLiquidityPool = hasTag(tagInfos, 'liquidityPool')
        const isTradingBot = hasTag(tagInfos, 'tradingBot')
        const isPhishing = hasTag(tagInfos, 'suspectedPhishingWallet', 'phishing')
        const isBundler = hasTag(tagInfos, 'bundle')
        const isSniper = hasTag(tagInfos, 'sniper')
        const isSmartMoney = hasTag(tagInfos, 'smartMoney')
        const isDev = hasTag(tagInfos, 'dev')
        const isInsider = hasTag(tagInfos, 'insider')
        
        // Extract KOL-specific data
        let kolName: string | undefined
        let kolImage: string | undefined
        let kolLink: string | undefined
        const kolTag = getTagInfo(tagInfos, 'kol')
        if (kolTag || wallet.kol) {
          // KOL name: prefer name, fallback to displayName
          kolName = kolTag?.name || kolTag?.displayName
          // KOL image: prefer kolTwitterImage, fallback to kolImage
          // Need to prepend https://static.okx.com for relative URLs
          const rawImage = kolTag?.kolTwitterImage || kolTag?.kolImage
          if (rawImage) {
            kolImage = rawImage.startsWith('http') ? rawImage : `https://static.okx.com${rawImage}`
          }
          kolLink = kolTag?.kolLink
          
          // If KOL has a name, use it as displayName (higher priority than other tags)
          if (kolName && !displayName) {
            displayName = kolName
          }
        }
        
        // Try to match tag names to available SVG icons
        // Priority: exchange name > LP name > any other tag name
        let nameIconPath: string | undefined
        
        // First try exchange name
        if (exchangeName) {
          nameIconPath = matchNameToIcon(exchangeName)
        }
        
        // Then try LP tag name
        if (!nameIconPath && lpTag?.name) {
          nameIconPath = matchNameToIcon(lpTag.name)
        }
        
        // Then try displayName
        if (!nameIconPath && displayName) {
          nameIconPath = matchNameToIcon(displayName)
        }
        
        // Finally try all tag names
        if (!nameIconPath) {
          for (const t of tagInfos) {
            if (t.name) {
              nameIconPath = matchNameToIcon(t.name)
              if (nameIconPath) break
            }
          }
        }
        
        const node: BubbleNode = {
          id: wallet.address,
          address: wallet.address,
          holdingPct,
          rank: 0, // Will be set after sorting
          clusterRank,
          clusterSize: cluster.children?.length || 1,
          tags: wallet.tagList || [],
          tagInfos,
          isContract: wallet.contract === true,
          isExchange: Array.isArray(wallet.exchange) && wallet.exchange.length > 0 || hasTag(tagInfos, 'exchange'),
          isKol: wallet.kol === true,
          isMevBot,
          isMevBotSandwich,
          isLiquidityPool,
          isTradingBot,
          isPhishing,
          isBundler,
          isSniper,
          isSmartMoney,
          isDev,
          isInsider,
          exchangeLogo,
          exchangeName,
          nameIconPath,
          value,
          displayName,
          displayAttr,
          // KOL-specific data
          kolName,
          kolImage,
          kolLink,
        }
        
        nodes.push(node)
        nodeMap.set(wallet.address, node)
      })
    }
  })

  // Sort nodes by holdingPct descending and assign rank
  nodes.sort((a, b) => b.holdingPct - a.holdingPct)
  nodes.forEach((node, index) => {
    node.rank = index + 1
  })

  // Process links
  const links: BubbleLink[] = []
  if (data.data.links) {
    data.data.links.forEach((link) => {
      if (nodeMap.has(link.source) && nodeMap.has(link.target)) {
        links.push({
          source: link.source,
          target: link.target,
          solid: link.solid !== false,
        })
      }
    })
  }

  return { nodes, links }
}

/** Get cluster color with HSL golden angle distribution - ensures no repeats */
function getClusterColor(clusterRank: number, _clusterCount?: number): string {
  if (clusterRank <= 0) {
    // Non-clustered nodes get uniform gray
    return '#535353ff'
  }
  
  // Use prime-based distribution for better color separation
  const primeMultiplier = 137.508 // Golden angle
  const hue = (clusterRank * primeMultiplier) % 360
  // Vary saturation and lightness slightly for more distinct colors
  const saturation = 65 + ((clusterRank * 7) % 20)
  const lightness = 50 + ((clusterRank * 11) % 15)
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

/** Parse HSL string to components */
function parseHSL(hslStr: string): { h: number; s: number; l: number } | null {
  const match = hslStr.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/)
  if (match) {
    return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) }
  }
  return null
}

/** Convert color to RGBA with opacity */
function colorWithOpacity(color: string, opacity: number): string {
  // Handle hex colors
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  
  // Handle HSL colors
  const hsl = parseHSL(color)
  if (hsl) {
    return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${opacity})`
  }
  
  return color
}

const BubbleMap = forwardRef<BubbleMapRef, BubbleMapProps>(function BubbleMap(
  { data, onNodeSelect, onNodeClick, selectedNode, highlightFilter },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const simulationRef = useRef<d3.Simulation<BubbleNode, BubbleLink> | null>(null)
  const [tooltip, setTooltip] = useState<{ node: BubbleNode; x: number; y: number } | null>(null)
  
  // Use refs for callbacks to avoid re-running the main useEffect when callbacks change
  const onNodeSelectRef = useRef(onNodeSelect)
  const onNodeClickRef = useRef(onNodeClick)
  
  // Keep refs up to date
  useEffect(() => {
    onNodeSelectRef.current = onNodeSelect
  }, [onNodeSelect])
  
  useEffect(() => {
    onNodeClickRef.current = onNodeClick
  }, [onNodeClick])
  
  // Touch hold state for mobile tooltip
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isTouchHoldingRef = useRef<boolean>(false)
  const touchNodeRef = useRef<BubbleNode | null>(null)
  const isDraggingRef = useRef<boolean>(false)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)

  // Expose zoom methods to parent
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (svgRef.current && zoomRef.current) {
        d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.5)
      }
    },
    zoomOut: () => {
      if (svgRef.current && zoomRef.current) {
        d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.67)
      }
    },
    resetZoom: () => {
      if (svgRef.current && zoomRef.current) {
        d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity)
      }
    },
    highlightNode: (nodeId: string) => {
      if (svgRef.current && zoomRef.current && simulationRef.current) {
        const nodes = simulationRef.current.nodes()
        const targetNode = nodes.find(n => n.id === nodeId)
        if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
          const container = containerRef.current
          if (container) {
            const width = container.clientWidth
            const height = container.clientHeight
            const scale = 1.5
            const x = width / 2 - targetNode.x * scale
            const y = height / 2 - targetNode.y * scale
            d3.select(svgRef.current)
              .transition()
              .duration(500)
              .call(zoomRef.current.transform, d3.zoomIdentity.translate(x, y).scale(scale))
          }
        }
      }
    },
    highlightByFilter: () => {
      // This is handled via the highlightFilter prop and useEffect
    },
  }))
  
  // Check if a node matches the highlight filter
  const nodeMatchesFilter = useCallback((node: BubbleNode, filter: HighlightFilter): boolean => {
    // Helper to check if node has a tag (using tagInfos which are properly parsed)
    const hasTagMatch = (searchTag: string): boolean => {
      const search = searchTag.toLowerCase()
      return node.tagInfos.some(ti => ti.tag.toLowerCase().includes(search))
    }
    
    switch (filter.type) {
      case 'rank':
        // Check if node rank is within the min-max range
        return node.rank >= filter.min && node.rank <= filter.max
      case 'tag':
        const tagLower = filter.tag.toLowerCase()
        // Check specific boolean flags first for performance
        if (tagLower === 'whale') return hasTagMatch('whale')
        if (tagLower === 'exchange') return node.isExchange
        if (tagLower === 'bundle') return node.isBundler
        if (tagLower === 'sniper') return node.isSniper
        if (tagLower === 'fresh') return hasTagMatch('fresh')
        if (tagLower === 'contract') return node.isContract
        if (tagLower === 'mevbot') return node.isMevBot || node.isMevBotSandwich
        if (tagLower === 'smartmoney') return node.isSmartMoney
        if (tagLower === 'dev') return node.isDev
        if (tagLower === 'insider') return node.isInsider
        if (tagLower === 'liquiditypool') return node.isLiquidityPool
        if (tagLower === 'tradingbot') return node.isTradingBot
        if (tagLower === 'kol') return node.isKol
        if (tagLower === 'phishing') return node.isPhishing
        // Fallback to tagInfos search
        return hasTagMatch(filter.tag)
      case 'cluster':
        return node.clusterRank === filter.clusterId
      case 'hideWallet':
        // For hideWallet, return true for all wallets EXCEPT the hidden one
        // This means the hidden wallet will be dimmed (doesn't match)
        return node.address.toLowerCase() !== filter.address.toLowerCase()
      case 'hideWallets':
        // For hideWallets, return true for all wallets NOT in the hidden list
        const hiddenSet = new Set(filter.addresses.map(a => a.toLowerCase()))
        return !hiddenSet.has(node.address.toLowerCase())
      case 'highlightWallet':
        // For highlightWallet, return true only for the matching wallet
        return node.address.toLowerCase() === filter.address.toLowerCase()
      default:
        return true
    }
  }, [])
  
  // Apply highlight filter effect with a small delay to ensure nodes are rendered
  useEffect(() => {
    // Small delay to ensure visualization has rendered the nodes
    const timeoutId = setTimeout(() => {
      if (!svgRef.current) return
      
      const svg = d3.select(svgRef.current)
      const nodeGroups = svg.selectAll<SVGGElement, BubbleNode>('.nodes g')
      const linkLines = svg.selectAll<SVGLineElement, BubbleLink>('.links line')
      
      if (nodeGroups.empty()) {
        // Nodes not rendered yet
        return
      }
      
      if (!highlightFilter) {
        // Reset all nodes and links to full opacity
        nodeGroups.transition().duration(200).style('opacity', 1)
        linkLines.transition().duration(200).style('opacity', 1)
        return
      }
      
      // Build a set of matching node IDs for quick lookup
      const matchingNodeIds = new Set<string>()
      nodeGroups.each(function(this: SVGGElement) {
        const el = d3.select(this)
        const nodeData = el.datum() as BubbleNode
        if (nodeData && nodeMatchesFilter(nodeData, highlightFilter)) {
          matchingNodeIds.add(nodeData.id)
        }
      })
      
      // Apply highlighting to nodes based on filter
      nodeGroups.each(function(this: SVGGElement) {
        const el = d3.select(this)
        const nodeData = el.datum() as BubbleNode
        if (nodeData) {
          const matches = matchingNodeIds.has(nodeData.id)
          el.transition().duration(200).style('opacity', matches ? 1 : 0.15)
        }
      })
      
      // Apply highlighting to links - dim links where both source and target don't match
      linkLines.each(function(this: SVGLineElement) {
        const el = d3.select(this)
        const linkData = el.datum() as BubbleLink
        if (linkData) {
          const sourceId = typeof linkData.source === 'object' ? linkData.source.id : linkData.source
          const targetId = typeof linkData.target === 'object' ? linkData.target.id : linkData.target
          // Show link at full opacity if either endpoint matches
          const matches = matchingNodeIds.has(sourceId) || matchingNodeIds.has(targetId)
          el.transition().duration(200).style('opacity', matches ? 0.6 : 0.05)
        }
      })
    }, 50) // Small delay to ensure DOM is ready
    
    return () => clearTimeout(timeoutId)
  }, [highlightFilter, nodeMatchesFilter])

  // Handle node selection - only fire if not from a touch hold
  // Uses refs to avoid recreating this callback and triggering useEffect re-runs
  const handleNodeClick = useCallback((node: BubbleNode) => {
    // If this was a touch hold (tooltip shown), don't trigger click
    if (isTouchHoldingRef.current) {
      isTouchHoldingRef.current = false
      return
    }
    onNodeSelectRef.current?.(node)
    onNodeClickRef.current?.(node)
  }, []) // Empty deps - uses refs
  
  // Clear touch timer on unmount
  useEffect(() => {
    return () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const container = containerRef.current
    const svg = d3.select(svgRef.current)
    const width = container.clientWidth
    const height = container.clientHeight

    // Clear previous content
    svg.selectAll('*').remove()

    // Transform data
    const { nodes, links } = transformClusterData(data)
    
    if (nodes.length === 0) return

    // Count unique clusters
    const clusterCount = new Set(nodes.map(n => n.clusterRank)).size

    // Create defs for arrow markers (one per cluster color)
    const defs = svg.append('defs')
    
    // Create arrow marker for each cluster
    const clusterColors = new Map<number, string>()
    nodes.forEach(n => {
      if (!clusterColors.has(n.clusterRank)) {
        clusterColors.set(n.clusterRank, getClusterColor(n.clusterRank, clusterCount))
      }
    })

    clusterColors.forEach((color, rank) => {
      defs.append('marker')
        .attr('id', `arrow-${rank}`)
        .attr('viewBox', '0 -3 6 6')
        .attr('refX', 6)
        .attr('refY', 0)
        .attr('markerWidth', 4)
        .attr('markerHeight', 4)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-3L6,0L0,3')
        .attr('fill', colorWithOpacity(color, 1))
    })

    // Size scale based on holding percentage
    const maxHolding = d3.max(nodes, d => d.holdingPct) || 1
    const sizeScale = d3.scaleSqrt()
      .domain([0, maxHolding])
      .range([8, 50])

    // Setup zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    
    svg.call(zoom)
    zoomRef.current = zoom

    // Create main group for zoom/pan
    const g = svg.append('g')

    // Create force simulation with balanced cohesion and spacing
    const simulation = d3.forceSimulation<BubbleNode>(nodes)
      .force('link', d3.forceLink<BubbleNode, BubbleLink>(links)
        .id(d => d.id)
        .distance(40) // Shorter link distance for tighter clusters
        .strength(0.8)) // Strong link strength to keep connected nodes together
      .force('charge', d3.forceManyBody<BubbleNode>()
        .strength(d => {
          // Weaker repulsion for clustered nodes, stronger for standalone
          const baseStrength = -sizeScale(d.holdingPct) * 2
          return d.clusterRank > 0 && d.clusterSize > 1 ? baseStrength * 0.5 : baseStrength
        })
        .distanceMin(15)
        .distanceMax(150)) // Shorter range so clusters don't push away distant nodes
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide<BubbleNode>()
        .radius(d => sizeScale(d.holdingPct) + 10) // Tighter collision radius
        .strength(0.9)
        .iterations(2))
      .force('x', d3.forceX(width / 2).strength(0.02))
      .force('y', d3.forceY(height / 2).strength(0.02))
      .force('cluster', (alpha: number) => {
        // Custom clustering force - pull cluster members toward their centroid
        const clusterCenters = new Map<number, { x: number; y: number; count: number }>()
        
        // Calculate cluster centroids
        nodes.forEach(node => {
          if (node.clusterRank > 0 && node.clusterSize > 1) {
            const center = clusterCenters.get(node.clusterRank) || { x: 0, y: 0, count: 0 }
            center.x += node.x || 0
            center.y += node.y || 0
            center.count++
            clusterCenters.set(node.clusterRank, center)
          }
        })
        
        clusterCenters.forEach((center) => {
          center.x /= center.count
          center.y /= center.count
        })
        
        // Pull cluster nodes toward their centroid
        nodes.forEach(node => {
          if (node.clusterRank > 0 && node.clusterSize > 1) {
            const center = clusterCenters.get(node.clusterRank)
            if (center) {
              const dx = center.x - (node.x || 0)
              const dy = center.y - (node.y || 0)
              const dist = Math.sqrt(dx * dx + dy * dy)
              // Stronger attraction for nodes further from center, up to a max
              const k = alpha * 0.6 * Math.min(dist / 50, 1.5)
              node.vx = (node.vx || 0) + dx * k * 0.1
              node.vy = (node.vy || 0) + dy * k * 0.1
            }
          }
        })
      })
      .force('clusterSeparation', (alpha: number) => {
        // Push different clusters apart to form distinct groups
        const clusterCenters = new Map<number, { x: number; y: number; count: number; nodes: BubbleNode[] }>()
        
        nodes.forEach(node => {
          if (node.clusterRank > 0 && node.clusterSize > 1) {
            const center = clusterCenters.get(node.clusterRank) || { x: 0, y: 0, count: 0, nodes: [] }
            center.x += node.x || 0
            center.y += node.y || 0
            center.count++
            center.nodes.push(node)
            clusterCenters.set(node.clusterRank, center)
          }
        })
        
        clusterCenters.forEach((center) => {
          center.x /= center.count
          center.y /= center.count
        })
        
        // Apply separation force between cluster centroids
        const clusters = Array.from(clusterCenters.entries())
        for (let i = 0; i < clusters.length; i++) {
          for (let j = i + 1; j < clusters.length; j++) {
            const [, c1] = clusters[i]
            const [, c2] = clusters[j]
            const dx = c2.x - c1.x
            const dy = c2.y - c1.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const minDist = 80 // Minimum distance between cluster centers
            
            if (dist < minDist) {
              const force = alpha * (minDist - dist) * 0.02
              const fx = (dx / dist) * force
              const fy = (dy / dist) * force
              
              // Apply force to all nodes in each cluster
              c1.nodes.forEach(n => {
                n.vx = (n.vx || 0) - fx
                n.vy = (n.vy || 0) - fy
              })
              c2.nodes.forEach(n => {
                n.vx = (n.vx || 0) + fx
                n.vy = (n.vy || 0) + fy
              })
            }
          }
        }
      })
    
    // Run simulation longer for better initial positioning
    simulation.alpha(1).alphaDecay(0.02)

    simulationRef.current = simulation

    // Create links with arrows
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => {
        const sourceNode = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source)
        const color = getClusterColor(sourceNode?.clusterRank || 0, clusterCount)
        return colorWithOpacity(color, 1.0)
      })
      .attr('stroke-width', 1)
      .attr('marker-end', d => {
        const sourceNode = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source)
        return `url(#arrow-${sourceNode?.clusterRank || 0})`
      })

    // Create node groups
    const nodeGroup = g.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, BubbleNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation()
        handleNodeClick(d)
      })
      // Desktop: show tooltip on hover
      .on('mouseenter', (event, d) => {
        // Only show tooltip on desktop (not touch devices)
        if ('ontouchstart' in window) return
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          setTooltip({
            node: d,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          })
        }
      })
      .on('mouseleave', () => {
        // Only hide on desktop
        if ('ontouchstart' in window) return
        setTooltip(null)
      })
      // Mobile: show tooltip after 500ms hold, detect drag vs tap
      .on('touchstart', (event, d) => {
        event.preventDefault()
        touchNodeRef.current = d
        isTouchHoldingRef.current = false
        isDraggingRef.current = false
        
        // Track start position for drag detection
        const touch = event.touches[0]
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
        
        // Clear any existing timer
        if (touchTimerRef.current) {
          clearTimeout(touchTimerRef.current)
        }
        
        // Start 500ms timer for tooltip
        touchTimerRef.current = setTimeout(() => {
          // Only show tooltip if not dragging
          if (!isDraggingRef.current) {
            isTouchHoldingRef.current = true
            const rect = containerRef.current?.getBoundingClientRect()
            if (rect && touchNodeRef.current) {
              setTooltip({
                node: touchNodeRef.current,
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top,
              })
            }
          }
        }, 500)
      })
      .on('touchend', () => {
        // Clear the timer
        if (touchTimerRef.current) {
          clearTimeout(touchTimerRef.current)
          touchTimerRef.current = null
        }
        
        // Hide tooltip
        setTooltip(null)
        
        // If it was a quick tap (not a hold and not a drag), trigger click
        if (!isTouchHoldingRef.current && !isDraggingRef.current && touchNodeRef.current) {
          handleNodeClick(touchNodeRef.current)
        }
        
        touchNodeRef.current = null
        isTouchHoldingRef.current = false
        isDraggingRef.current = false
        touchStartPosRef.current = null
      })
      .on('touchmove', (event) => {
        // Check if user moved enough to be considered a drag
        if (touchStartPosRef.current) {
          const touch = event.touches[0]
          const dx = touch.clientX - touchStartPosRef.current.x
          const dy = touch.clientY - touchStartPosRef.current.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          // If moved more than 10px, it's a drag
          if (distance > 10) {
            isDraggingRef.current = true
            // Cancel tooltip timer
            if (touchTimerRef.current) {
              clearTimeout(touchTimerRef.current)
              touchTimerRef.current = null
            }
            setTooltip(null)
          }
        }
      })
      .on('touchcancel', () => {
        // Cancel everything
        if (touchTimerRef.current) {
          clearTimeout(touchTimerRef.current)
          touchTimerRef.current = null
        }
        setTooltip(null)
        touchNodeRef.current = null
        isTouchHoldingRef.current = false
        isDraggingRef.current = false
        touchStartPosRef.current = null
      })

    // Add circles with stroke-only styling
    // Non-clustered nodes (clusterRank <= 0) get uniform gray color
    nodeGroup.append('circle')
      .attr('r', d => sizeScale(d.holdingPct))
      .attr('fill', d => {
        // Non-clustered nodes get uniform gray
        if (d.clusterRank <= 0) {
          return 'rgba(107, 114, 128, 0.3)' // Gray with low opacity
        }
        const color = getClusterColor(d.clusterRank, clusterCount)
        return colorWithOpacity(color, 0.15)
      })
      .attr('stroke', d => {
        // Non-clustered nodes get uniform gray stroke
        if (d.clusterRank <= 0) {
          return '#535353ff'
        }
        return getClusterColor(d.clusterRank, clusterCount)
      })
      .attr('stroke-width', 1.)
      .attr('class', d => 
        selectedNode?.id === d.id ? 'ring-2 ring-white ring-offset-2' : ''
      )

    // Add FA icons for special nodes - size scales with node
    const getIconSize = (d: BubbleNode) => Math.max(Math.min(sizeScale(d.holdingPct) * 0.6, 32), 14)

    // Helper to render icon on node
    const renderNodeIcon = (
      selection: d3.Selection<SVGGElement, BubbleNode, SVGGElement, unknown>,
      icon: typeof faFileLines,
      color: string = 'white'
    ) => {
      selection.each(function(d) {
        const iconSize = getIconSize(d)
        d3.select(this)
          .append('foreignObject')
          .attr('width', iconSize * 2)
          .attr('height', iconSize * 2)
          .attr('x', -iconSize)
          .attr('y', -iconSize)
          .append('xhtml:div')
          .style('width', '100%')
          .style('height', '100%')
          .style('display', 'flex')
          .style('align-items', 'center')
          .style('justify-content', 'center')
          .html(renderToStaticMarkup(
            <FontAwesomeIcon icon={icon} style={{ color, width: iconSize, height: iconSize }} />
          ))
      })
    }

    // HIGHEST PRIORITY: Name-based SVG icons from /public/icon/ folder
    // These take precedence over ALL other icons including exchange logos
    nodeGroup.filter(d => !!d.nameIconPath)
      .append('image')
      .attr('xlink:href', d => d.nameIconPath || '')
      .attr('width', d => sizeScale(d.holdingPct) * 1.2)
      .attr('height', d => sizeScale(d.holdingPct) * 1.2)
      .attr('x', d => -sizeScale(d.holdingPct) * 0.6)
      .attr('y', d => -sizeScale(d.holdingPct) * 0.6)
      .style('border-radius', '50%')
      .attr('clip-path', 'circle(100%)')

    // Helper to check if KOL image URL looks valid
    const isValidKolImageUrl = (url: string | undefined): boolean => {
      if (!url) return false
      return url.startsWith('http') && 
        (url.includes('.jpg') || url.includes('.jpeg') || 
         url.includes('.png') || url.includes('.gif') || 
         url.includes('.webp') || url.includes('.svg') ||
         url.includes('pbs.twimg.com') || url.includes('static.okx.com'))
    }

    // SECOND PRIORITY: KOL with valid image - show their profile image
    // KOLs are important so we show them with higher priority
    nodeGroup.filter(d => !d.nameIconPath && d.isKol && isValidKolImageUrl(d.kolImage))
      .append('image')
      .attr('xlink:href', d => d.kolImage || '')
      .attr('width', d => sizeScale(d.holdingPct) * 1.4)
      .attr('height', d => sizeScale(d.holdingPct) * 1.4)
      .attr('x', d => -sizeScale(d.holdingPct) * 0.7)
      .attr('y', d => -sizeScale(d.holdingPct) * 0.7)
      .style('border-radius', '50%')
      .attr('clip-path', 'circle(50%)')
      .on('error', function() {
        // On error, hide the broken image
        d3.select(this).attr('display', 'none')
      })

    // THIRD PRIORITY: Exchange logo images (when no name-based icon or KOL image)
    nodeGroup.filter(d => d.isExchange && !!d.exchangeLogo && !d.nameIconPath && !(d.isKol && isValidKolImageUrl(d.kolImage)))
      .append('image')
      .attr('xlink:href', d => d.exchangeLogo || '')
      .attr('width', d => sizeScale(d.holdingPct) * 1.2)
      .attr('height', d => sizeScale(d.holdingPct) * 1.2)
      .attr('x', d => -sizeScale(d.holdingPct) * 0.6)
      .attr('y', d => -sizeScale(d.holdingPct) * 0.6)
      .style('border-radius', '50%')
      .attr('clip-path', 'circle(50%)')

    // KOL without valid image - fallback to mic icon (moved up in priority)
    renderNodeIcon(
      nodeGroup.filter(d => !d.nameIconPath && d.isKol && !isValidKolImageUrl(d.kolImage) && !d.isExchange),
      faMicrophoneLines,
      '#facc15' // yellow for KOL
    )

    // Exchange icon (fallback when no logo and no name icon) 
    renderNodeIcon(
      nodeGroup.filter(d => d.isExchange && !d.exchangeLogo && !d.nameIconPath && !d.isKol),
      faBuildingColumns,
      'white'
    )

    // MEV Bot Sandwich icon (skip if has name icon or is KOL)
    renderNodeIcon(
      nodeGroup.filter(d => d.isMevBotSandwich && !d.isExchange && !d.nameIconPath && !d.isKol),
      faBurger,
      '#f59e0b' // amber
    )

    // MEV Bot icon (skip if has name icon or is KOL)
    renderNodeIcon(
      nodeGroup.filter(d => d.isMevBot && !d.isMevBotSandwich && !d.isExchange && !d.nameIconPath && !d.isKol),
      faRobot,
      '#8b5cf6' // purple
    )

    // All icon rendering below excludes nodes with nameIconPath and KOLs
    
    // Phishing wallet icon
    renderNodeIcon(
      nodeGroup.filter(d => !d.nameIconPath && !d.isKol && d.isPhishing && !d.isExchange && !d.isMevBot && !d.isMevBotSandwich),
      faFish,
      '#ca3f64' // pink/red
    )

    // Trading Bot icon (override contract)
    renderNodeIcon(
      nodeGroup.filter(d => !d.nameIconPath && !d.isKol && d.isTradingBot && !d.isExchange && !d.isMevBot && !d.isMevBotSandwich && !d.isPhishing),
      faRobot,
      '#10b981' // green
    )

    // Bundler icon
    renderNodeIcon(
      nodeGroup.filter(d => !d.nameIconPath && !d.isKol && d.isBundler && !d.isExchange && !d.isMevBot && !d.isMevBotSandwich && !d.isPhishing && !d.isTradingBot),
      faLayerGroup,
      '#fb923c' // light orange
    )

    // Sniper icon
    renderNodeIcon(
      nodeGroup.filter(d => !d.nameIconPath && !d.isKol && d.isSniper && !d.isExchange && !d.isBundler && !d.isMevBot && !d.isMevBotSandwich && !d.isPhishing && !d.isTradingBot),
      faCrosshairs,
      '#ef4444' // red
    )

    // Insider icon
    renderNodeIcon(
      nodeGroup.filter(d => !d.nameIconPath && !d.isKol && d.isInsider && !d.isExchange && !d.isSniper && !d.isBundler && !d.isMevBot && !d.isMevBotSandwich && !d.isPhishing && !d.isTradingBot),
      faClockRotateLeft,
      '#a855f7' // purple
    )

    // Smart Money icon
    renderNodeIcon(
      nodeGroup.filter(d => !d.nameIconPath && !d.isKol && d.isSmartMoney && !d.isExchange && !d.isInsider && !d.isSniper && !d.isBundler && !d.isMevBot && !d.isMevBotSandwich && !d.isPhishing && !d.isTradingBot),
      faGlasses,
      '#06b6d4' // cyan
    )

    // Dev icon
    renderNodeIcon(
      nodeGroup.filter(d => !d.nameIconPath && d.isDev && !d.isExchange && !d.isSmartMoney && !d.isInsider && !d.isSniper && !d.isBundler && !d.isMevBot && !d.isMevBotSandwich && !d.isPhishing && !d.isTradingBot),
      faCode,
      '#22c55e' // green
    )

    // Liquidity Pool icon (override contract)
    renderNodeIcon(
      nodeGroup.filter(d => !d.nameIconPath && d.isLiquidityPool && !d.isExchange && !d.isDev && !d.isSmartMoney && !d.isInsider && !d.isSniper && !d.isBundler && !d.isMevBot && !d.isMevBotSandwich && !d.isPhishing && !d.isTradingBot),
      faDroplet,
      '#3b82f6' // blue
    )

    // Contract icon - scales with node size (lowest priority among special icons)
    renderNodeIcon(
      nodeGroup.filter(d => !d.nameIconPath && d.isContract && !d.isExchange && !d.isLiquidityPool && !d.isDev && !d.isSmartMoney && !d.isInsider && !d.isSniper && !d.isBundler && !d.isMevBot && !d.isMevBotSandwich && !d.isPhishing && !d.isTradingBot && !d.isKol),
      faFileLines,
      'white'
    )

    // Drag behavior - doesn't restart simulation aggressively
    const drag = d3.drag<SVGGElement, BubbleNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.1).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    nodeGroup.call(drag)

    // Update positions on simulation tick
    simulation.on('tick', () => {
      // Update link positions to connect to node borders
      link
        .attr('x1', d => {
          const source = d.source as BubbleNode
          const target = d.target as BubbleNode
          const dx = (target.x || 0) - (source.x || 0)
          const dy = (target.y || 0) - (source.y || 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const radius = sizeScale(source.holdingPct)
          return (source.x || 0) + (dx / dist) * radius
        })
        .attr('y1', d => {
          const source = d.source as BubbleNode
          const target = d.target as BubbleNode
          const dx = (target.x || 0) - (source.x || 0)
          const dy = (target.y || 0) - (source.y || 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const radius = sizeScale(source.holdingPct)
          return (source.y || 0) + (dy / dist) * radius
        })
        .attr('x2', d => {
          const source = d.source as BubbleNode
          const target = d.target as BubbleNode
          const dx = (source.x || 0) - (target.x || 0)
          const dy = (source.y || 0) - (target.y || 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const radius = sizeScale(target.holdingPct) + 4 // Extra offset for arrow
          return (target.x || 0) + (dx / dist) * radius
        })
        .attr('y2', d => {
          const source = d.source as BubbleNode
          const target = d.target as BubbleNode
          const dx = (source.x || 0) - (target.x || 0)
          const dy = (source.y || 0) - (target.y || 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const radius = sizeScale(target.holdingPct) + 4 // Extra offset for arrow
          return (target.y || 0) + (dy / dist) * radius
        })

      // Update node positions
      nodeGroup.attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`)
    })

    // Click on background deselects
    svg.on('click', () => {
      onNodeSelectRef.current?.(null)
    })

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [data, handleNodeClick]) // Only re-run when data changes - callbacks use refs

  // Calculate tooltip position - ensure it stays in view
  const getTooltipStyle = () => {
    if (!tooltip || !containerRef.current) return {}
    
    const containerWidth = containerRef.current.clientWidth || 0
    const tooltipWidth = 200  // approximate max-w-xs
    const tooltipHeight = 180 // approximate height
    
    // Check if tooltip would be cut off at top
    const showBelow = tooltip.y < tooltipHeight + 20
    
    // Horizontal positioning - stay within bounds
    let left = tooltip.x + 10
    if (left + tooltipWidth > containerWidth) {
      left = Math.max(10, tooltip.x - tooltipWidth - 10)
    }
    
    if (showBelow) {
      return {
        left,
        top: tooltip.y + 20,
        transform: 'none',
      }
    } else {
      return {
        left,
        top: tooltip.y - 10,
        transform: 'translateY(-100%)',
      }
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ touchAction: 'none', backgroundImage: 'radial-gradient(#33415550 1px, transparent 1px)', backgroundSize: '15px 15px' }}
      />
      
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50 bg-slate-800/95 backdrop-blur-sm 
                     rounded-lg shadow-xl border border-slate-700 p-3 max-w-xs"
          style={getTooltipStyle()}
        >
          {/* Header with type icon and address */}
          <div className="flex items-center gap-2 mb-2">
            {/* Determine which icon to show - EXCHANGE has highest priority */}
            {tooltip.node.isExchange && tooltip.node.exchangeLogo ? (
              <img 
                src={tooltip.node.exchangeLogo} 
                alt={tooltip.node.exchangeName || 'Exchange'} 
                className="w-6 h-6 rounded-full border border-slate-600"
              />
            ) : tooltip.node.isExchange ? (
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faBuildingColumns} className="w-3 h-3 text-blue-400" />
              </div>
            ) : tooltip.node.isMevBotSandwich ? (
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faBurger} className="w-3 h-3 text-amber-400" />
              </div>
            ) : tooltip.node.isMevBot ? (
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faRobot} className="w-3 h-3 text-purple-400" />
              </div>
            ) : tooltip.node.isPhishing ? (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(202, 63, 100, 0.2)' }}>
                <FontAwesomeIcon icon={faFish} className="w-3 h-3" style={{ color: '#ca3f64' }} />
              </div>
            ) : tooltip.node.isTradingBot ? (
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faRobot} className="w-3 h-3 text-emerald-400" />
              </div>
            ) : tooltip.node.isBundler ? (
              <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faLayerGroup} className="w-3 h-3 text-orange-400" />
              </div>
            ) : tooltip.node.isSniper ? (
              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faCrosshairs} className="w-3 h-3 text-red-400" />
              </div>
            ) : tooltip.node.isInsider ? (
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faClockRotateLeft} className="w-3 h-3 text-purple-400" />
              </div>
            ) : tooltip.node.isSmartMoney ? (
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faGlasses} className="w-3 h-3 text-cyan-400" />
              </div>
            ) : tooltip.node.isDev ? (
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faCode} className="w-3 h-3 text-green-400" />
              </div>
            ) : tooltip.node.isLiquidityPool ? (
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faDroplet} className="w-3 h-3 text-blue-400" />
              </div>
            ) : tooltip.node.isContract ? (
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faFileLines} className="w-3 h-3 text-purple-400" />
              </div>
            ) : tooltip.node.isKol ? (
              <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faMicrophoneLines} className="w-3 h-3 text-yellow-400" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"/>
                </svg>
              </div>
            )}
            <div>
              {/* Display name (from exchange or tag with name) */}
              {tooltip.node.displayName && (
                <div className="text-sm font-medium text-white">
                  {tooltip.node.displayName}
                  {tooltip.node.displayAttr && (
                    <span className="text-slate-400 text-xs ml-1">({tooltip.node.displayAttr})</span>
                  )}
                </div>
              )}
              <span className="font-mono text-xs text-slate-400">
                {truncateAddress(tooltip.node.address)}
              </span>
            </div>
          </div>
          
          {/* Type badges */}
          <div className="flex flex-wrap gap-1 mb-2">
            {tooltip.node.isMevBotSandwich && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs flex items-center gap-1">
                <FontAwesomeIcon icon={faBurger} className="w-2.5 h-2.5" />
                Sandwich Bot
              </span>
            )}
            {tooltip.node.isMevBot && !tooltip.node.isMevBotSandwich && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs flex items-center gap-1">
                <FontAwesomeIcon icon={faRobot} className="w-2.5 h-2.5" />
                MEV Bot
              </span>
            )}
            {tooltip.node.isPhishing && (
              <span className="px-2 py-0.5 rounded text-xs flex items-center gap-1" style={{ backgroundColor: 'rgba(202, 63, 100, 0.2)', color: '#ca3f64' }}>
                <FontAwesomeIcon icon={faFish} className="w-2.5 h-2.5" />
                Phishing
              </span>
            )}
            {tooltip.node.isTradingBot && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs flex items-center gap-1">
                <FontAwesomeIcon icon={faRobot} className="w-2.5 h-2.5" />
                Trading Bot
              </span>
            )}
            {tooltip.node.isBundler && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs flex items-center gap-1">
                <FontAwesomeIcon icon={faLayerGroup} className="w-2.5 h-2.5" />
                Bundler
              </span>
            )}
            {tooltip.node.isSniper && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs flex items-center gap-1">
                <FontAwesomeIcon icon={faCrosshairs} className="w-2.5 h-2.5" />
                Sniper
              </span>
            )}
            {tooltip.node.isInsider && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs flex items-center gap-1">
                <FontAwesomeIcon icon={faClockRotateLeft} className="w-2.5 h-2.5" />
                Insider
              </span>
            )}
            {tooltip.node.isSmartMoney && (
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs flex items-center gap-1">
                <FontAwesomeIcon icon={faGlasses} className="w-2.5 h-2.5" />
                Smart Money
              </span>
            )}
            {tooltip.node.isDev && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs flex items-center gap-1">
                <FontAwesomeIcon icon={faCode} className="w-2.5 h-2.5" />
                Dev
              </span>
            )}
            {tooltip.node.isLiquidityPool && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs flex items-center gap-1">
                <FontAwesomeIcon icon={faDroplet} className="w-2.5 h-2.5" />
                LP
              </span>
            )}
            {tooltip.node.isExchange && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs flex items-center gap-1">
                <FontAwesomeIcon icon={faBuildingColumns} className="w-2.5 h-2.5" />
                Exchange
              </span>
            )}
            {tooltip.node.isContract && !tooltip.node.isLiquidityPool && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs flex items-center gap-1">
                <FontAwesomeIcon icon={faFileLines} className="w-2.5 h-2.5" />
                Contract
              </span>
            )}
            {tooltip.node.isKol && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs flex items-center gap-1">
                {tooltip.node.kolImage ? (
                  <img src={tooltip.node.kolImage} alt="" className="w-3 h-3 rounded-full" />
                ) : (
                  <FontAwesomeIcon icon={faMicrophoneLines} className="w-2.5 h-2.5" />
                )}
                {tooltip.node.kolName || 'KOL'}
                {tooltip.node.kolLink && (
                  <a 
                    href={tooltip.node.kolLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-1 text-yellow-300 hover:text-yellow-200"
                  >
                    ↗
                  </a>
                )}
              </span>
            )}
          </div>
          
          {/* Stats */}
          <div className="space-y-1.5 text-xs border-t border-slate-700 pt-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Holding:</span>
              <span className="text-white font-medium">{formatPercent(tooltip.node.holdingPct)}</span>
            </div>
            {tooltip.node.value !== undefined && tooltip.node.value > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Value:</span>
                <span className="text-white">{formatValue(tooltip.node.value)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Cluster:</span>
              <span className={tooltip.node.clusterRank > 0 ? 'text-white' : 'text-slate-500'}>
                {tooltip.node.clusterRank > 0 ? `#${tooltip.node.clusterRank}` : 'None'}
              </span>
            </div>
          </div>
          
          {/* Click hint */}
          <div className="mt-2 pt-2 border-t border-slate-700 text-center">
            <span className="text-[10px] text-slate-500">Click for details</span>
          </div>
        </div>
      )}
    </div>
  )
})

export default BubbleMap
