# System Patterns

> Architecture patterns and integration approaches for this project.

## Data Flow Pattern

```
Token Search → Chain Selection → API Fetch → Cache Check → Parse Response → Render UI
                                     ↓
                         localStorage Cache (1h TTL)
                                     ↓
                         Rate Limit Check (30 req/min)
                                     ↓
                         Retry with Backoff (3 attempts)
                                     ↓
                         CORS Proxy Fallback (2 proxies)
```

## Component Architecture

### Full Component Tree
```
src/components/
├── BubbleMap/              # D3 force-directed graph
│   ├── index.tsx           # Main component, D3 initialization
│   ├── useForceSimulation.ts   # D3 force simulation hook
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
├── WalletCard/             # Reusable wallet display
│   ├── index.tsx           # Card container
│   ├── AddressHeader.tsx   # Address + tags
│   ├── HoldingsInfo.tsx    # Amount, value, percentage
│   └── PnLDisplay.tsx      # Individual P&L
└── ChainSelector/          # Chain picker dropdown
    └── index.tsx           # With chain icons
```

### Mobile Layout
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

### API Hook Pattern
```typescript
// All API hooks follow this structure
function useClusterData(tokenAddress: string, chainId: ChainId) {
  const [data, setData] = useState<ClusterResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    // Use src/lib/api.ts client which handles:
    // 1. Cache check (1 hour TTL)
    // 2. Rate limiting (30 req/min)
    // 3. Fetch with retry (3 attempts)
    // 4. CORS proxy fallback
    // 5. Error normalization
  }, [tokenAddress, chainId]);

  return { data, loading, error };
}
```

## State Management Pattern

### Local State Only
- No Redux/Zustand needed for this scope
- React `useState` + `useEffect` for data fetching
- `useReducer` only if state logic gets complex

### Cache Pattern
```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache TTL by data type
const CACHE_TTL = {
  CLUSTER: 60 * 60 * 1000,    // 1 hour
  TOKEN_INFO: 60 * 60 * 1000, // 1 hour  
  P2P: 15 * 60 * 1000,        // 15 minutes
  FAVORITES: Infinity,        // Persistent
};

function getCached<T>(key: string, ttl: number): T | null {
  const entry = localStorage.getItem(key);
  if (!entry) return null;
  const { data, timestamp } = JSON.parse(entry) as CacheEntry<T>;
  if (Date.now() - timestamp > CACHE_TTL) return null;
  return data;
}
```

## Error Handling Pattern

```typescript
// Wrap API calls with this pattern
async function fetchWithFallback<T>(url: string): Promise<T> {
  try {
    // 1. Try direct call
    const res = await fetch(url);
    if (res.ok) return res.json();
  } catch (e) {
    // 2. Try CORS proxy
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) return res.json();
  }
  throw new Error('API request failed');
}
```

## Mobile-First Layout Pattern

```css
/* Base: Mobile (375px+) */
.container { padding: 1rem; }

/* Tablet (768px+) */
@media (min-width: 768px) {
  .container { padding: 2rem; }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container { max-width: 1200px; margin: 0 auto; }
}
```

## Integration Points

### Search → Data Fetch
1. User enters token address
2. Validate format (0x prefix, length)
3. Detect chain (try each chainId until success)
4. Fetch cluster data + token info in parallel
5. Merge and display

### Map Node → Detail Popup
1. User taps node
2. Node data passed to popup component
3. Same popup used in wallet list
4. Lazy-load P2P transaction data on demand
