/**
 * Formatting Utilities
 * 
 * Display formatting for addresses, values, percentages, and timestamps.
 * Mobile-optimized: condensed output for small screens.
 */

/**
 * Truncate wallet address for display
 * @example "0x1234567890abcdef1234" → "0x1234...1234"
 */
export function truncateAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format USD value with abbreviation
 * @example 1234567.89 → "$1.23M"
 */
export function formatValue(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '$0.00';
  if (num === 0) return '$0.00';
  
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (abs >= 1e18) return `${sign}$${(abs / 1e18).toFixed(2)}E`;
  if (abs >= 1e15) return `${sign}$${(abs / 1e15).toFixed(2)}Q`;
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  if (abs >= 0.01) return `${sign}$${abs.toFixed(4)}`;
  
  return `${sign}$${abs.toExponential(2)}`;
}

/**
 * Format token amount with abbreviation
 * @example 1234567.89 → "1.23M"
 */
export function formatAmount(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) return '0';
  if (num === 0) return '0';
  
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (abs >= 1e18) return `${sign}${(abs / 1e18).toFixed(2)}E`;
  if (abs >= 1e15) return `${sign}${(abs / 1e15).toFixed(2)}Q`;
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)}K`;
  if (abs >= 1) return `${sign}${abs.toFixed(2)}`;
  
  return `${sign}${abs.toFixed(2)}`;
}

/**
 * Convert decimal string to percentage display
 * @example "0.95653" → "95.65%"
 */
export function formatPercent(pct: string | number): string {
  const num = typeof pct === 'string' ? parseFloat(pct) : pct;
  
  if (isNaN(num)) return '0.00%';
  
  const percentage = num * 100;
  
  if (Math.abs(percentage) < 0.01) return '<0.01%';
  if (Math.abs(percentage) < 1) return `${percentage.toFixed(2)}%`;
  
  return `${percentage.toFixed(2)}%`;
}

/**
 * Format PnL percentage with sign and color class
 * @example "1.07497" → { text: "+107.50%", class: "text-green-500" }
 */
export function formatPnlPercent(pnlPct: string | number): { text: string; colorClass: string } {
  const num = typeof pnlPct === 'string' ? parseFloat(pnlPct) : pnlPct;
  
  if (isNaN(num) || num === 0) {
    return { text: '0.00%', colorClass: 'text-gray-500' };
  }
  
  const percentage = num * 100;
  const sign = percentage > 0 ? '+' : '';
  const colorClass = percentage > 0 ? 'text-green-500' : 'text-red-500';
  
  return {
    text: `${sign}${percentage.toFixed(2)}%`,
    colorClass,
  };
}

/**
 * Format Unix timestamp as full date
 * @example 1756914776 → "Nov 27, 2025"
 */
export function formatDate(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '--';
  
  // Handle both seconds and milliseconds
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  
  const date = new Date(ms);
  
  if (isNaN(date.getTime())) return '--';
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format Unix timestamp as relative time
 * @example 1764231659 (2 days ago) → "2d ago"
 */
export function formatRelativeTime(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '';
  
  // Handle both seconds and milliseconds
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  
  const now = Date.now();
  const diff = now - ms;
  
  if (diff < 0) return 'Just now';
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  
  return formatDate(timestamp);
}

/**
 * Convert a number to subscript digits
 * @example 5 → "₅", 12 → "₁₂"
 */
function toSubscript(num: number): string {
  const subscriptDigits = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  return String(num).split('').map(d => subscriptDigits[parseInt(d)] || d).join('');
}

/**
 * Format price with appropriate precision
 * For small decimals (more than 1 zero after decimal), uses subscript notation
 * @example "0.732749577590612615" → "$0.7327"
 * @example "0.00000123456" → "$0.0₅123" (5 zeros, then first 3 significant digits)
 * @example "0.000000000000123" → "$0.0₁₂123" (12 zeros, then first 3 significant digits)
 */
export function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(num)) return '$0.00';
  if (num === 0) return '$0.00';
  
  // Handle negative numbers
  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(num);
  
  if (absNum >= 1000) return `${sign}$${absNum.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (absNum >= 1) return `${sign}$${absNum.toFixed(2)}`;
  if (absNum >= 0.01) return `${sign}$${absNum.toFixed(4)}`;
  
  // For very small numbers, count zeros after decimal and use subscript notation
  // e.g., 0.00000123 → "0.0₅123" (5 zeros after decimal, then significant digits)
  const str = absNum.toFixed(20); // Get enough precision
  const match = str.match(/^0\.0*/);
  
  if (match) {
    const leadingPart = match[0]; // e.g., "0.00000"
    const zeroCount = leadingPart.length - 2; // Count zeros after "0."
    
    // Only use subscript notation if more than 1 zero after decimal
    if (zeroCount > 1) {
      // Get the significant digits (first 3 non-zero digits)
      const restOfNumber = str.slice(leadingPart.length);
      const significantDigits = restOfNumber.replace(/0+$/, '').slice(0, 3);
      
      return `${sign}$0.0${toSubscript(zeroCount)}${significantDigits}`;
    }
  }
  
  // Fallback for numbers between 0.001 and 0.01
  if (absNum >= 0.0001) return `${sign}$${absNum.toFixed(6)}`;
  
  return `${sign}$${absNum.toExponential(2)}`;
}

/**
 * Format market cap with abbreviation
 * @example "732749577.590612615" → "$732.75M"
 */
export function formatMarketCap(marketCap: string | number): string {
  return formatValue(marketCap);
}

/**
 * Flatten nested tag arrays
 * @example [["whales"], ["topHolder"]] → ["whales", "topHolder"]
 */
export function flattenTags(tagList: string[][]): string[] {
  if (!tagList || !Array.isArray(tagList)) return [];
  return tagList.flat().filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);
}

/**
 * Get display label for tag
 * @example "topHolder" → "Top Holder"
 */
export function formatTag(tag: string): string {
const tagLabels: Record<string, string> = {
    whales: 'Whale',
    topHolder: 'Top Holder',
    bundle: 'Bundle',
    kol: 'KOL',
    contract: 'Contract',
    exchange: 'Exchange',
    communityRecognized: 'Community',
    devHoldingRatio_0: 'Dev 0%',
    paperHands: 'Paper Hands',
    mevBot: 'MEV Bot',
    mevBot_sandwich: 'Sandwich Bot',
    suspectedPhishingWallet: 'Phishing',
    fresh: 'Fresh',
    freshWallet: 'Fresh Wallet',
    tradingBot: 'Trading Bot',
    smartMoney: 'Smart Money',
    dev: 'Dev',
    sniper: 'Sniper',
    bundler: 'Bundler',
    insider: 'Insider',
    liquidityPool: 'LP',
};
  
  return tagLabels[tag] || tag;
}
