import { useState, useCallback } from 'react'
import type { Holding, HoldingWithValue, PriceCache } from '@/types'
import { fetchAllPrices, isCacheStale } from '@/services/priceService'

export function usePrices(initialCache: PriceCache = {}) {
  const [priceCache, setPriceCache] = useState<PriceCache>(initialCache)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const refreshPrices = useCallback(async (holdings: Holding[]) => {
    setIsLoading(true)

    try {
      const newCache = await fetchAllPrices(holdings, priceCache)
      setPriceCache(newCache)
      setLastUpdated(new Date().toISOString())
      return newCache
    } catch (err) {
      console.error('Failed to fetch prices:', err)
      return priceCache
    } finally {
      setIsLoading(false)
    }
  }, [priceCache])

  const setAllPrices = useCallback((cache: PriceCache) => {
    setPriceCache(cache)
  }, [])

  const getHoldingsWithValues = useCallback((holdings: Holding[]): HoldingWithValue[] => {
    return holdings.map(holding => {
      let currentPrice = 0
      let priceSource: 'api' | 'manual' | 'cached' = 'manual'
      let lastUpdatedPrice: string | undefined

      // Manual price override takes priority for all categories
      if (holding.manualPrice && holding.manualPrice > 0) {
        currentPrice = holding.manualPrice
        priceSource = 'manual'
      } else if (holding.identifier) {
        const cached = priceCache[holding.identifier]
        if (cached) {
          currentPrice = cached.price
          priceSource = isCacheStale(cached) ? 'cached' : 'api'
          lastUpdatedPrice = new Date(cached.timestamp).toISOString()
        }
      }

      return {
        ...holding,
        currentPrice,
        totalValue: holding.quantity * currentPrice,
        priceSource,
        lastUpdated: lastUpdatedPrice,
      }
    })
  }, [priceCache])

  return {
    priceCache,
    isLoading,
    lastUpdated,
    refreshPrices,
    setAllPrices,
    getHoldingsWithValues,
  }
}
