/**
 * API Type Definitions
 * 
 * TypeScript interfaces matching OKX API response schemas.
 * See PLAN.md for complete field documentation.
 */

// =============================================================================
// Holder Intelligence API Types
// =============================================================================

/** Exchange information for wallet addresses */
export interface ExchangeInfo {
  name: string;
  attr: string;
  logoUrl: string;
}

/** Individual wallet address within a cluster */
export interface WalletChild {
  address: string;
  rank: number;
  holdingPct: string;
  holdingAmount: string;
  holdingValue: string;
  holdingAvgTime: number;
  lastActive: number;
  tagList: string[][];
  trend?: string[];
  contract: boolean;
  exchange: boolean | ExchangeInfo[];
  kol: boolean;
  tokenPnl?: string;
  tokenPnlPct?: string;
  boughtValue?: string;
  avgCost?: string;
  soldValue?: string;
  avgSell?: string;
}

/** Cluster of related wallet addresses */
export interface Cluster {
  clusterName: string;
  clusterId: number;
  rank: number;
  followed: boolean;
  createdAt: number;
  addressCount: number;
  holdingAmount: string;
  holdingValue: string;
  holdingPct: string;
  holdingAvgTime: string;
  tokenPnl: string;
  tokenPnlPct: string;
  boughtValue: string;
  avgCost: string;
  soldValue: string;
  avgSell: string;
  lastActive: number;
  children: WalletChild[];
  trend?: string[];
}

/** Link between wallet addresses */
export interface WalletLink {
  source: string;
  target: string;
  solid: boolean;
}

/** Main holder intelligence data */
export interface ClusterData {
  chain: string;
  tokenAddress: string;
  tokenName: string;
  clusterConcentration: string;
  top100Holding: string;
  rugpullProbability: string;
  freshWallets: string;
  sameRecentFundingSource: string;
  sameCreationTime: string;
  links: WalletLink[];
  clusterList: Cluster[];
  createdAt: number;
}

/** Complete API response for holder intelligence */
export interface ClusterResponse {
  code: number;
  msg: string;
  error_code: string;
  error_message: string;
  detailMsg: string;
  data: ClusterData;
}

// =============================================================================
// Token Info API Types
// =============================================================================

/** Early buyer statistics */
export interface EarlyBuyerStats {
  chainId: number;
  earlyBuyerHoldAmount: string;
  tokenContractAddress: string;
  totalEarlyBuyerAmount: string;
}

/** Third-party integration info */
export interface TokenThirdPartyInfo {
  okxDarkDefaultLogo: string;
  okxDarkHoverLogo: string;
  okxLightDefaultLogo: string;
  okxLightHoverLogo: string;
  okxWebSiteName: string;
  okxWebSiteUrl: string;
  thirdPartyWebSiteColorLogo: string;
  thirdPartyWebSiteGreyLogo: string;
  thirdPartyWebSiteName: string;
  thirdPartyWebSiteUrl: string;
}

/** Token metadata and market data */
export interface TokenInfoData {
  bundleHoldingRatio: string;
  chainBWLogoUrl: string;
  chainLogoUrl: string;
  chainName: string;
  change: string;
  change1H: string;
  change4H: string;
  change5M: string;
  changeUtc0: string;
  changeUtc8: string;
  circulatingSupply: string;
  dappList: unknown[];
  devHoldingRatio: string;
  earlyBuyerStatisticsInfo: EarlyBuyerStats;
  holders: string;
  liquidity: string;
  marketCap: string;
  maxPrice: string;
  minPrice: string;
  nativeTokenSymbol: string;
  price: string;
  riskControlLevel: string;
  riskLevel: string;
  snipersClear: string;
  snipersTotal: string;
  suspiciousHoldingRatio: string;
  tagList: string[][];
  tokenContractAddress: string;
  tokenLargeLogoUrl: string;
  tokenLogoUrl: string;
  tokenName: string;
  tokenSymbol: string;
  tokenThirdPartInfo: TokenThirdPartyInfo;
  top10HoldAmountPercentage: string;
  tradeNum: string;
  transactionNum: string;
  volume: string;
  // Optional/rarely used fields
  isCollected?: string;
  isSubscribe?: string;
  isSupportHolder?: string;
  supportSwap?: string;
  supportTrader?: string;
}

/** Complete API response for token info */
export interface TokenInfoResponse {
  code: number;
  msg: string;
  error_code: string;
  error_message: string;
  detailMsg: string;
  data: TokenInfoData;
}

// =============================================================================
// P2P Transaction API Types
// =============================================================================

/** Asset change within a transaction */
export interface AssetChange {
  brc20Coin: boolean;
  brc20sCoin: boolean;
  direction: number; // 1=receive, 2=send
  coinAmount: string;
  coinSymbol: string;
  coinImgUrl: string;
  chainId: number;
  tokenAddress: string;
}

/** Individual transaction record */
export interface Transaction {
  txhash: string;
  address: string;
  from: string;
  to: string;
  txType: number; // 1=receive, 2=send
  coinAmount: string;
  coinSymbol: string;
  txTime: number;
  txStatus: number;
  rowId: string;
  direction: number; // 1=receive, 2=send
  network: string;
  assetChange: AssetChange[];
  chainId: number;
  chainSymbol: string;
  serviceCharge: string;
  orderType: number;
  // UI flags (can be ignored)
  isShowPending: boolean;
  isShowSpeedUp: boolean;
  isShowCancel: boolean;
  isShowSpeedupCancel: boolean;
  showCancel: boolean;
  showSpeedupCancel: boolean;
  showSpeedUp: boolean;
  showPending: boolean;
}

/** P2P transaction list data */
export interface P2PTransactionData {
  content: Transaction[];
  hasViewMore: boolean;
  explorerUrl: Record<string, string>;
}

/** Complete API response for P2P transactions */
export interface P2PTransactionResponse {
  code: number;
  msg: string;
  error_code: string;
  error_message: string;
  detailMsg: string;
  data: P2PTransactionData;
}

/** Request body for P2P transaction API */
export interface P2PTransactionRequest {
  addressList: string[];
  chainId: number;
  startTime: number;
  endTime: number;
  limit: number;
  lastRowId: string;
  hideValuelessNft: boolean;
}

// =============================================================================
// Chain Configuration
// =============================================================================

/** Supported blockchain networks */
export type ChainId = 1 | 56 | 501 | 8453;

export interface ChainConfig {
  id: ChainId;
  name: string;
  symbol: string;
  addressPrefix: string;
  addressLength: number;
}

export const CHAINS: Record<ChainId, ChainConfig> = {
  1: { id: 1, name: 'Ethereum', symbol: 'ETH', addressPrefix: '0x', addressLength: 42 },
  56: { id: 56, name: 'BSC', symbol: 'BNB', addressPrefix: '0x', addressLength: 42 },
  501: { id: 501, name: 'Solana', symbol: 'SOL', addressPrefix: '', addressLength: 44 },
  8453: { id: 8453, name: 'Base', symbol: 'ETH', addressPrefix: '0x', addressLength: 42 },
};

// =============================================================================
// App-Level Types
// =============================================================================

/** Processed wallet node for bubble map */
export interface BubbleNode {
  id: string;
  address: string;
  holdingPct: number;
  holdingValue: number;
  clusterRank: number;
  clusterName: string;
  tags: string[];
  isContract: boolean;
  isExchange: boolean;
  isKol: boolean;
  exchangeInfo?: ExchangeInfo;
  pnl?: number;
  pnlPct?: number;
  // D3 simulation properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

/** Processed link for bubble map */
export interface BubbleLink {
  source: string | BubbleNode;
  target: string | BubbleNode;
  solid: boolean;
  transactions?: Transaction[];
}

/** Cache entry wrapper */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
