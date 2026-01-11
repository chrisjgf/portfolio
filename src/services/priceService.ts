import type { Holding, PriceCache, PriceCacheEntry } from '@/types'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

let cachedUsdToGbp: { rate: number; timestamp: number } | null = null

export async function getUsdToGbpRate(): Promise<number> {
  const now = Date.now()
  if (cachedUsdToGbp && now - cachedUsdToGbp.timestamp < CACHE_DURATION) {
    return cachedUsdToGbp.rate
  }

  try {
    const response = await fetch(`${COINGECKO_BASE}/simple/price?ids=usd&vs_currencies=gbp`)
    if (response.ok) {
      const data = await response.json()
      if (data.usd?.gbp) {
        cachedUsdToGbp = { rate: data.usd.gbp, timestamp: now }
        return data.usd.gbp
      }
    }
  } catch (error) {
    console.error('Failed to fetch USD/GBP rate:', error)
  }

  // Fallback rate if API fails
  return 0.79
}

export async function fetchCoinGeckoPrices(
  coinIds: string[]
): Promise<Record<string, number>> {
  if (coinIds.length === 0) return {}

  // Fetch prices in USD
  const url = `${COINGECKO_BASE}/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`)
  }

  const data = await response.json()
  const prices: Record<string, number> = {}

  for (const coinId of coinIds) {
    if (data[coinId]?.usd) {
      prices[coinId] = data[coinId].usd
    }
  }

  return prices
}

async function fetchWithProxy(url: string): Promise<Response | null> {
  // Try multiple CORS proxies as fallbacks
  const proxies = [
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  ]

  for (const makeProxyUrl of proxies) {
    try {
      const response = await fetch(makeProxyUrl(url))
      if (response.ok) {
        return response
      }
    } catch (e) {
      console.warn(`Proxy failed for ${url}:`, e)
    }
  }

  // Try direct fetch as last resort (works in some environments)
  try {
    const response = await fetch(url)
    if (response.ok) return response
  } catch (e) {
    console.warn(`Direct fetch failed for ${url}:`, e)
  }

  return null
}

export async function fetchYahooPrice(ticker: string): Promise<number | null> {
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d`
    const response = await fetchWithProxy(yahooUrl)

    if (!response) {
      console.error(`All fetches failed for ${ticker}`)
      return null
    }

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error(`Invalid JSON for ${ticker}:`, text.substring(0, 200))
      return null
    }

    const result = data.chart?.result?.[0]

    if (!result?.meta?.regularMarketPrice) {
      console.error(`No price data for ${ticker}:`, JSON.stringify(data).substring(0, 200))
      return null
    }

    let price = result.meta.regularMarketPrice
    const currency = result.meta.currency

    console.log(`${ticker}: ${price} ${currency}`)

    // Convert GBp (pence) to GBP first
    if (currency === 'GBp') {
      price = price / 100
    }

    // Convert GBP to USD for consistency (all prices stored in USD)
    if (currency === 'GBP' || currency === 'GBp') {
      const usdToGbp = await getUsdToGbpRate()
      return price / usdToGbp // GBP to USD
    }

    // Already in USD
    return price
  } catch (error) {
    console.error(`Failed to fetch ${ticker}:`, error)
  }

  return null
}

function normalizeYahooTicker(ticker: string, category: string): string {
  // If already has a suffix (like .L, .AS, .PA), use as-is
  if (ticker.includes('.')) {
    return ticker
  }

  // For metals category, add .L suffix for UK-listed ETCs
  if (category === 'metals') {
    return `${ticker}.L`
  }

  // For stocks, leave as-is (user should add .L for UK stocks)
  return ticker
}

export async function fetchAllPrices(
  holdings: Holding[],
  cache: PriceCache
): Promise<PriceCache> {
  const now = Date.now()
  const newCache = { ...cache }

  const coinGeckoIds: string[] = []
  const yahooTickers: { ticker: string; originalId: string }[] = []

  for (const holding of holdings) {
    if (!holding.identifier) continue

    const cached = cache[holding.identifier]
    const isFresh = cached && (now - cached.timestamp) < CACHE_DURATION

    if (!isFresh) {
      if (holding.category === 'crypto') {
        coinGeckoIds.push(holding.identifier)
      } else if (holding.category === 'metals' || holding.category === 'stock') {
        const normalizedTicker = normalizeYahooTicker(holding.identifier, holding.category)
        yahooTickers.push({ ticker: normalizedTicker, originalId: holding.identifier })
      }
    }
  }

  // Fetch CoinGecko prices (batched)
  if (coinGeckoIds.length > 0) {
    try {
      const prices = await fetchCoinGeckoPrices(coinGeckoIds)
      for (const [id, price] of Object.entries(prices)) {
        newCache[id] = { price, timestamp: now, source: 'coingecko' }
      }
    } catch (error) {
      console.error('CoinGecko batch fetch failed:', error)
    }
  }

  // Fetch Yahoo prices (sequential to avoid rate limits)
  for (const { ticker, originalId } of yahooTickers) {
    const price = await fetchYahooPrice(ticker)
    if (price !== null) {
      // Store under the original identifier so cache lookups work
      newCache[originalId] = { price, timestamp: now, source: 'yahoo' }
    }
  }

  return newCache
}

export function isCacheStale(entry: PriceCacheEntry | undefined): boolean {
  if (!entry) return true
  return Date.now() - entry.timestamp > CACHE_DURATION
}
