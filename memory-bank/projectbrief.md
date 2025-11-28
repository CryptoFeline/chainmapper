# Project Brief: Crypto Holder Mapping

## Vision

Build a mobile-first web application for visualizing cryptocurrency token holder data through interactive bubble maps, top holder lists, and profit/loss analytics.

## Core Objectives

1. **Holder Visualization** - Interactive D3.js bubble map showing wallet clusters and transaction relationships
2. **Top Holder Analysis** - Ranked list of token holders with sorting by holdings, P&L, tags
3. **P&L Tracking** - Per-wallet and per-cluster profit/loss visualization
4. **Mobile-First UX** - Touch-optimized interface with condensed data display

## Target Users

- Crypto traders analyzing token holder distribution
- Researchers investigating wallet relationships
- Investors assessing token concentration risk

## Success Criteria

- [ ] Token address input with chain auto-detection
- [ ] Bubble map rendering within 2s of data load
- [ ] Touch gestures (zoom/pan) work smoothly on mobile
- [ ] Wallet details popup accessible from map and list
- [ ] Data cached in localStorage for repeat searches

## Non-Goals (Current Scope)

- Backend server (all API calls client-side)
- User authentication
- Wallet connection/transactions
- Historical price charts

## Key Constraints

- **Static deployment**: Vercel/Netlify hosting only
- **No API keys**: OKX APIs are public, no auth required
- **CORS handling**: Use proxy fallbacks if direct calls fail
- **Mobile-first**: All features must work on 375px+ screens

## References

- [PLAN.md](../PLAN.md) - Full API schemas and data mapping
- [AGENT.md](../AGENT.md) - Development workflow guide
