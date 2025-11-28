# Project Rules

> Coding standards and conventions for this project.

## TypeScript

### Strict Mode
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Type Naming
- Interfaces for API responses: `ClusterResponse`, `TokenInfo`
- Props types: `ComponentNameProps`
- Avoid `any` - use `unknown` if type uncertain

## React Conventions

### Component Structure
```typescript
// 1. Imports
import { useState, useEffect } from 'react';

// 2. Types
interface WalletCardProps {
  address: string;
  holdingPct: string;
}

// 3. Component
export function WalletCard({ address, holdingPct }: WalletCardProps) {
  // 4. Hooks first
  const [expanded, setExpanded] = useState(false);

  // 5. Render
  return (
    <div className="wallet-card">
      {/* ... */}
    </div>
  );
}
```

### File Naming
- Components: PascalCase (`WalletCard.tsx`)
- Hooks: camelCase with `use` prefix (`useClusterData.ts`)
- Utilities: camelCase (`formatters.ts`)

## Data Display Rules

### Address Formatting
```typescript
// Always truncate addresses
function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
// Example: 0x1234567890abcdef1234 → 0x1234...1234
```

### Value Formatting
```typescript
// Always abbreviate large numbers
function formatValue(val: number): string {
  if (val >= 1e15) return `$${(val / 1e15).toFixed(2)}Q`;
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
}
// Example: 1234567.89 → $1.23M
```

### Percentage Formatting
```typescript
// Convert decimal strings to percentage
function formatPercent(pct: string): string {
  const val = parseFloat(pct) * 100;
  return `${val.toFixed(2)}%`;
}
// Example: "0.95653" → "95.65%"
```

### Time Formatting
- **Timestamps** (`createdAt`): Full date "Nov 27, 2025"
- **Activity** (`lastActive`): Relative "2d ago", "5h ago"

## Error Messages

- User-facing: Friendly, actionable
- Developer logs: Include error object, context

```typescript
// User sees
"Unable to load token data. Please check the address and try again."

// Console logs
console.error('API fetch failed:', { url, chainId, error });
```

## Import Order

1. React/Next imports
2. Third-party libraries
3. Local components
4. Hooks
5. Utilities
6. Types
7. Styles

## Commit Messages

Follow conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code restructuring
- `docs:` documentation
- `chore:` maintenance
