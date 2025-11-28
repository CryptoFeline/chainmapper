import type { ChainId, ClusterResponse, TokenInfoResponse, WalletChild } from '@/types/api'
import type { HighlightFilter } from '@/components/BubbleMap'

/** Chain configuration with logos and explorer URLs */
export const CHAIN_OPTIONS: Array<{ id: ChainId; name: string; logo: string; explorer: string }> = [
  { id: 1, name: 'Ethereum', logo: 'https://static.coinall.ltd/cdn/wallet/logo/ETH-20220328.png', explorer: 'https://etherscan.io/token/' },
  { id: 56, name: 'BSC', logo: 'https://static.coinall.ltd/cdn/wallet/logo/bnb_5000_new.png', explorer: 'https://bscscan.com/token/' },
  { id: 501, name: 'Solana', logo: 'https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png', explorer: 'https://solscan.io/token/' },
  { id: 8453, name: 'Base', logo: 'https://static.coinall.ltd/cdn/wallet/logo/base_20800_new.png', explorer: 'https://basescan.org/token/' },
]

/** Search state */
export interface SearchResult {
  cluster: ClusterResponse;
  tokenInfo: TokenInfoResponse;
}

/** Bracket stats for holder groups */
export interface BracketStats {
  totalHolding: number;
  totalPct: number;
  avgPnl: number;
  avgHoldingTime: number;
  avgCost: number;
  avgSell: number;
  trend: string;
  totalValue: number;
}

/** Props for OverviewTab */
export interface OverviewTabProps {
  result: SearchResult;
  tokenPrice: number;
  onHighlight?: (filter: HighlightFilter | null) => void;
  activeHighlight?: string | null;
}

/** Props for ClustersTab */
export interface ClustersTabProps {
  result: SearchResult;
  chainId: ChainId;
  tokenPrice: number;
  onClusterClick: (clusterId: number) => void;
  onWalletClick: (address: string) => void;
}

/** Props for WalletsTab */
export interface WalletsTabProps {
  result: SearchResult;
  chainId: ChainId;
  sortBy: 'holding' | 'pnl' | 'value';
  sortAsc: boolean;
  filter: 'all' | 'whale' | 'exchange' | 'contract';
  onSortByChange: (sort: 'holding' | 'pnl' | 'value') => void;
  onSortAscChange: (asc: boolean) => void;
  onFilterChange: (filter: 'all' | 'whale' | 'exchange' | 'contract') => void;
  onWalletClick: (address: string) => void;
}

/** Props for WalletDetailModal */
export interface WalletDetailModalProps {
  wallet: WalletChild & { clusterRank: number; clusterName: string; clusterSize: number };
  chainId: ChainId;
  tokenSymbol: string;
  onClose: () => void;
}

/** Props for ClusterDetailModal */
export interface ClusterDetailModalProps {
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
    children: WalletChild[];
  };
  chainId: ChainId;
  tokenSymbol: string;
  onClose: () => void;
  onWalletClick: (address: string) => void;
}

/** Get exchange info from wallet exchange array */
export function getExchangeInfo(exchange?: boolean | Array<{ exchangeId?: string; exchangeName: string; logoUrl: string; name?: string; attr?: string }>) {
  if (!exchange || exchange === true || (Array.isArray(exchange) && exchange.length === 0)) {
    return { isExchange: false, name: null, logo: null }
  }
  if (Array.isArray(exchange)) {
    const ex = exchange[0]
    return { isExchange: true, name: ex.exchangeName || ex.name || 'Exchange', logo: ex.logoUrl }
  }
  return { isExchange: false, name: null, logo: null }
}
