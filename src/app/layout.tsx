import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Chainmapper - Holder Visualization',
  description: 'Visualize crypto token holder distribution with interactive bubble maps',
  keywords: ['crypto', 'holder', 'wallet', 'bubble map', 'token', 'analysis'],
  authors: [{ name: 'Chainmapper' }],
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Chainmapper - Holder Visualization',
    description: 'Visualize crypto token holder distribution',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent zoom for better touch UX on map
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Telegram WebApp SDK for Mini App detection */}
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <SpeedInsights/><Analytics/>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
