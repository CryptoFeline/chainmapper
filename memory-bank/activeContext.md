# Active Context

> Current sprint focus and immediate priorities.

## Current Phase: Ready for Deployment

**Sprint Goal**: Deploy to Vercel and optionally extract inline components to separate files.

## Immediate Priorities

1. **Deploy to Vercel** - Push to Git and deploy with `vercel.json` config
2. **Optional: Extract Components** - Move inline components from page.tsx to separate files
3. **Add Tests** - Unit tests for API client and utility functions

## Completed (Full Feature Set)

### Landing Page
- [x] Recent searches horizontal scroll with token logos and chain badges
- [x] Favorites vertical list with remove functionality
- [x] Quick search by clicking recent/favorite tokens

### Results View
- [x] Compact header with search, token info, and favorite toggle
- [x] D3.js bubble map with force-directed layout
- [x] Touch gestures: zoom, pan, drag, tap-to-select, hold-for-tooltip
- [x] Node highlighting by filter (rank, tag, cluster)

### Side Panel (3 Tabs)
- [x] Overview: Risk metrics, market data, holder performance by bracket
- [x] Clusters: Expandable list of connected wallet clusters
- [x] Wallets: Sortable/filterable list with PnL display

### Modals
- [x] Wallet detail: Trading activity, timing, tags, cluster info
- [x] Cluster detail: Overview and member wallet list

### API & Data
- [x] OKX Holder Intelligence API integration
- [x] Token Info API integration
- [x] Error handling with user-friendly messages
- [x] Rate limiting and retry logic
- [x] CORS proxy fallback
- [x] LocalStorage caching (1h cluster, 15min P2P)
- [x] Favorites and recent tokens persistence

## In Progress

- [ ] Deploy to Vercel (free tier)
- [ ] Extract components from page.tsx (optional refactor)

## Recent Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-28 | Keep components inline | Faster development, can refactor later |
| 2025-11-28 | Add favorites to landing | Better UX for returning users |
| 2025-11-28 | Use vercel.json | Explicit config for deployment |

## Context for Next Session

- Project builds successfully
- Ready for Git push and Vercel deployment
- `page.tsx` has all functionality but is 2800+ lines
- Backup at `page.backup.tsx` for component extraction reference

## File Structure

```
src/
├── app/
│   ├── page.tsx          # Main app (all components inline)
│   └── page.backup.tsx   # Backup for reference
├── components/
│   ├── BubbleMap/        # D3 visualization (extracted)
│   └── shared/types.ts   # Shared TypeScript interfaces
├── lib/api.ts            # API client with caching
├── types/api.ts          # API response types
└── utils/                # Formatters and helpers
```
