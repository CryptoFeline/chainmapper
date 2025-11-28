# Copilot Instructions for Crypto Holder Mapping

> Mobile-first webapp for crypto holder visualization via bubble maps, toplists, and PnL data.

## Project Context

This is a **static frontend webapp** (no backend) using OKX APIs for crypto holder intelligence. All API calls are client-side. Target deployment: Vercel/Netlify.

### Tech Stack (Planned)
- **Framework**: React/Next.js with TypeScript
- **Visualization**: D3.js for interactive bubble maps
- **Styling**: Mobile-first CSS (Tailwind recommended)
- **State**: Local state + localStorage caching

## Core Development Rules

### 1. Reuse Over Creation
Before creating new files, search for:
- Existing components that can be extended
- Patterns already established in the codebase
- Shared utilities that handle similar logic

When proposing new files, document: "Searched for [X], found [Y], cannot extend because [reason]."

### 2. Approval-First Workflow
1. **PLAN** - Present approach with file citations
2. **BUILD** - Implement changes (don't apply yet)
3. **DIFF** - Show proposed changes with rationale
4. **APPROVAL** - Wait for explicit user confirmation
5. **APPLY** - Only after approval

### 3. Mobile-First Constraints
- Touch gestures: zoom/pan for bubble map
- Condensed data display (truncate addresses to `0x1234...5678`)
- Abbreviate large numbers (`$1.2M` not `$1,234,567.89`)
- Icon-based tags over text labels

## API Integration Patterns

### OKX Holder Intelligence API
```typescript
// Cluster/Holder data endpoint
const CLUSTER_API = 'https://web3.okx.com/priapi/v1/holder-intelligence/cluster/info';
// Params: chainId (1|56|501|8453), chainIndex, tokenAddress, t (timestamp)
```

### Chain ID Mapping
| Chain | chainId | chainIndex |
|-------|---------|------------|
| Ethereum | 1 | 1 |
| BSC | 56 | 56 |
| Solana | 501 | 501 |
| Base | 8453 | 8453 |

### Token Info API
```typescript
const TOKEN_API = 'https://web3.okx.com/priapi/v1/dx/market/v2/latest/info';
// Params: tokenContractAddress, chainId, t
```

### P2P Transaction API (POST)
```typescript
const P2P_API = 'https://web3.okx.com/priapi/v1/wallet/tx/order/list';
// Body: { addressList, chainId, startTime, endTime, limit, lastRowId, hideValuelessNft }
```

## Data Model Reference

### Bubble Map Node
```typescript
interface WalletNode {
  address: string;                    // data.clusterList[].children[].address
  holdingPct: string;                 // Node size
  clusterRank: number;                // Node color grouping
  tags: string[][];                   // tagList (whales, topHolder, etc.)
  isContract: boolean;
  isExchange: boolean;
  isKol: boolean;
  exchangeLogo?: string;              // exchange[].logoUrl
}
```

### Link Relationship
```typescript
interface WalletLink {
  source: string;                     // data.links[].source
  target: string;                     // data.links[].target
  solid: boolean;                     // Link validity
  // Enriched from P2P API:
  transactions?: TransactionData[];
}
```

## Component Patterns

### Wallet Address Display
```typescript
// Always truncate: 0x1234567890abcdef → 0x1234...cdef
const truncateAddress = (addr: string) => 
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;
```

### Value Formatting
```typescript
// Abbreviate large values: 1234567.89 → $1.23M
const formatValue = (val: number) => {
  if (val >= 1e15) return `$${(val / 1e15).toFixed(2)}Q`;
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
};
```

### Timestamp Display
- **Full date**: Use for `createdAt` stamps
- **Relative time**: Use for `lastActive` (`2d ago`, `5h ago`)

## Chain Configuration

### Chain Selector Icons
| Chain | chainId | Logo URL |
|-------|---------|----------|
| Ethereum | 1 | `https://static.coinall.ltd/cdn/wallet/logo/ETH-20220328.png` |
| BSC | 56 | `https://static.coinall.ltd/cdn/wallet/logo/bnb_5000_new.png` |
| Solana | 501 | `https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png` |
| Base | 8453 | `https://static.coinall.ltd/cdn/wallet/logo/base_20800_new.png` |

## API Error Handling

### Error Types
```typescript
type ApiErrorCode = 
  | 'NETWORK_ERROR'    // Connection issues
  | 'CORS_ERROR'       // All proxies failed
  | 'RATE_LIMITED'     // Too many requests
  | 'INVALID_RESPONSE' // Unexpected API response
  | 'TOKEN_NOT_FOUND'  // Token doesn't exist on chain
  | 'TIMEOUT';         // Request took too long
```

### Retry Strategy
- Max 3 retries with exponential backoff
- Base delay: 1s, max delay: 10s
- No retry on rate limit errors

### Rate Limiting
- 30 requests per minute client-side limit
- Show user-friendly wait message when exceeded

## CORS Handling Strategy

1. **First try**: Direct API call
2. **Fallback 1**: `https://corsproxy.io/?`
3. **Fallback 2**: `https://api.allorigins.win/raw?url=`
4. **Last resort**: Vercel/Netlify edge function proxy

## Caching Strategy

```typescript
// Cache TTL by data type
const CACHE_TTL = {
  CLUSTER: 60 * 60 * 1000,   // 1 hour - holder data
  TOKEN_INFO: 60 * 60 * 1000, // 1 hour - token metadata
  P2P: 15 * 60 * 1000,        // 15 minutes - transactions
  FAVORITES: Infinity,        // Persistent
};
```

## Quality Gates

### Before Proposing Changes
- [ ] Searched for existing similar code
- [ ] Verified mobile responsiveness
- [ ] No hardcoded sensitive data
- [ ] Error states handled
- [ ] Loading states implemented

### Security Checklist
- No API keys in client code (OKX APIs are public)
- Input validation on token addresses (0x prefix, length check)
- Sanitize displayed data

## Component Architecture

### Core Components
```
src/components/
├── BubbleMap/              # D3 force-directed graph
│   ├── index.tsx           # Main component
│   ├── useForceSimulation.ts
│   ├── NodeRenderer.tsx    # Individual bubble nodes
│   └── LinkRenderer.tsx    # Connection lines
├── OverviewPanel/          # Side panel with token summary
│   ├── index.tsx           # Panel container
│   ├── TokenHeader.tsx     # Logo, name, price
│   ├── RiskMetrics.tsx     # Rugpull, concentration
│   └── PnLSummary.tsx      # Aggregate P&L stats
├── NodeList/               # Wallet/cluster list view
│   ├── index.tsx           # List container with filters
│   ├── WalletRow.tsx       # Individual wallet display
│   ├── ClusterGroup.tsx    # Expandable cluster section
│   └── FilterBar.tsx       # Sort/filter controls
├── WalletCard/             # Reusable wallet display (popup/list)
│   ├── index.tsx           # Card container
│   ├── AddressHeader.tsx   # Address + tags
│   ├── HoldingsInfo.tsx    # Amount, value, percentage
│   └── PnLDisplay.tsx      # Individual P&L
└── ChainSelector/          # Chain picker dropdown
    └── index.tsx           # With chain icons
```

### Panel Layout (Mobile)
```
┌─────────────────────────┐
│ Header + Search + Chain │
├─────────────────────────┤
│                         │
│      Bubble Map         │
│   (zoomable/pannable)   │
│                         │
├─────────────────────────┤
│ Overview │ Node List    │  ← Tab switcher
├─────────────────────────┤
│ Content Panel           │
│ (scrollable)            │
└─────────────────────────┘
```

## File Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/           # UI components
├── hooks/               # Custom React hooks
│   ├── useClusterData.ts
│   ├── useTokenInfo.ts
│   └── useP2PTransactions.ts
├── lib/
│   └── api.ts           # Full API client with error handling
├── utils/
│   ├── formatters.ts    # Display formatting
│   └── chainMapping.ts  # Chain configuration
└── types/
    └── api.ts           # TypeScript interfaces
```

## References

- **Architecture Guide**: See `AGENT.md` for workflow state machine
- **API Schemas**: See `PLAN.md` for complete field mappings
- **Data Usage**: See `PLAN.md#Data usage from fields` sections
- **API Client**: See `src/lib/api.ts` for fetch implementation
