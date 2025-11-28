/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette for crypto theme
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // PnL colors
        profit: '#22c55e',
        loss: '#ef4444',
        // Cluster colors for bubble map
        cluster: {
          1: '#3b82f6', // Blue - Rank 1
          2: '#8b5cf6', // Purple - Rank 2
          3: '#ec4899', // Pink - Rank 3
          4: '#f97316', // Orange - Rank 4
          5: '#eab308', // Yellow - Rank 5
          default: '#535353ff', // Gray - Other ranks
        },
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
