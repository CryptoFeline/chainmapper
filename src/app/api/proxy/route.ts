/**
 * API Proxy Route
 * 
 * Proxies requests to OKX API to avoid CORS issues.
 * This runs server-side so there are no browser CORS restrictions.
 */

import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ENDPOINTS = [
  'https://web3.okx.com/priapi/v1/holder-intelligence/cluster/info',
  'https://web3.okx.com/priapi/v1/dx/market/v2/latest/info',
  'https://web3.okx.com/priapi/v1/wallet/tx/order/list',
]

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Security: Only allow proxying to whitelisted OKX endpoints
  const isAllowed = ALLOWED_ENDPOINTS.some(endpoint => url.startsWith(endpoint))
  if (!isAllowed) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // Don't follow redirects automatically
      redirect: 'follow',
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from upstream' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Security: Only allow proxying to whitelisted OKX endpoints
  const isAllowed = ALLOWED_ENDPOINTS.some(endpoint => url.startsWith(endpoint))
  if (!isAllowed) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })
  }

  try {
    const body = await request.json()
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Proxy POST error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from upstream' },
      { status: 500 }
    )
  }
}
