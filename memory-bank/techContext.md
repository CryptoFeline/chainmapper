# Technical Context

## Tech Stack

### Frontend Framework
- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **React 18** for UI components

### Visualization
- **D3.js** for bubble map force-directed graph
- Touch gesture support for mobile zoom/pan

### Styling
- **Tailwind CSS** for utility-first styling
- Mobile-first responsive breakpoints

### State Management
- React hooks for local state
- **localStorage** for caching fetched data
- No external state library (keep simple)

## Dependencies (Planned)

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "d3": "^7.8.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/d3": "^7.4.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

## API Endpoints

### Primary: Holder Intelligence
```
GET https://web3.okx.com/priapi/v1/holder-intelligence/cluster/info
Params: chainId, chainIndex, tokenAddress, t
```

### Secondary: Token Info
```
GET https://web3.okx.com/priapi/v1/dx/market/v2/latest/info
Params: tokenContractAddress, chainId, t
```

### Enrichment: P2P Transactions
```
POST https://web3.okx.com/priapi/v1/wallet/tx/order/list
Body: { addressList, chainId, startTime, endTime, limit, lastRowId, hideValuelessNft }
```

## Environment

- **Node.js**: 18+ LTS
- **Package Manager**: npm or pnpm
- **Deployment**: Vercel (preferred) or Netlify
- **Browser Support**: Chrome 90+, Safari 14+, Firefox 90+

## CORS Strategy

1. Direct API call (works in some contexts)
2. Proxy URL: `https://corsproxy.io/?{url}`
3. Edge function proxy (last resort)

## Performance Targets

- Initial load: < 3s on 4G
- Data fetch: < 2s per token
- Map interaction: 60fps on mid-range devices
- Cache hit: Instant display
