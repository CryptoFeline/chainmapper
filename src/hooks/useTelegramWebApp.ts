/**
 * Telegram WebApp Hook
 * 
 * Detects if the app is running inside Telegram Mini App environment.
 * Provides access to Telegram WebApp data and methods.
 */

import { useState, useEffect } from 'react'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    query_id?: string
    user?: TelegramUser
    auth_date?: number
    hash?: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
  }
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  ready: () => void
  expand: () => void
  close: () => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export interface TelegramWebAppState {
  /** Whether the app is running inside Telegram Mini App */
  isTelegram: boolean
  /** Whether detection has completed */
  isLoading: boolean
  /** Telegram WebApp instance (if available) */
  webApp: TelegramWebApp | null
  /** Telegram user data (if available) */
  user: TelegramUser | null
  /** Color scheme from Telegram */
  colorScheme: 'light' | 'dark' | null
}

/**
 * Hook to detect and interact with Telegram Mini App environment
 */
export function useTelegramWebApp(): TelegramWebAppState {
  const [state, setState] = useState<TelegramWebAppState>({
    isTelegram: false,
    isLoading: true,
    webApp: null,
    user: null,
    colorScheme: null,
  })

  useEffect(() => {
    // Small delay to allow Telegram SDK to load
    const checkTelegram = () => {
      const webApp = window.Telegram?.WebApp
      
      if (webApp) {
        // Check if actually running inside Telegram (has valid initData)
        const isTelegram = webApp.initData !== '' && webApp.initData !== undefined
        
        setState({
          isTelegram,
          isLoading: false,
          webApp: isTelegram ? webApp : null,
          user: isTelegram ? webApp.initDataUnsafe?.user || null : null,
          colorScheme: isTelegram ? webApp.colorScheme : null,
        })
        
        // Signal to Telegram that the app is ready
        if (isTelegram) {
          webApp.ready()
          webApp.expand() // Expand to full height
        }
      } else {
        setState({
          isTelegram: false,
          isLoading: false,
          webApp: null,
          user: null,
          colorScheme: null,
        })
      }
    }

    // Check after a brief delay to allow SDK to load
    const timeout = setTimeout(checkTelegram, 100)
    
    return () => clearTimeout(timeout)
  }, [])

  return state
}

export default useTelegramWebApp
