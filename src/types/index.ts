export type AssetCategory =
  | 'crypto'
  | 'metals'
  | 'stock'
  | 'cash'
  | 'seed'

export type Currency = 'USD' | 'GBP'

export interface Holding {
  id: string
  name: string
  category: AssetCategory
  quantity: number
  identifier?: string // ticker (TSLA), ISIN, or CoinGecko ID (bitcoin)
  manualPrice?: number // for cash/seed - price per unit in GBP
}

export interface HoldingWithValue extends Holding {
  currentPrice: number
  totalValue: number
  priceSource: 'api' | 'manual' | 'cached'
  lastUpdated?: string
}

export interface HistorySnapshot {
  date: string
  totalValue: number
  categoryValues: Record<AssetCategory, number>
}

export interface PriceCacheEntry {
  price: number
  timestamp: number
  source: 'coingecko' | 'yahoo'
}

export type PriceCache = Record<string, PriceCacheEntry>

export interface PortfolioData {
  holdings: Holding[]
  history: HistorySnapshot[]
  priceCache: PriceCache
  exportedAt?: string
}

export const CATEGORY_CONFIG: Record<AssetCategory, { label: string; color: string; hexColor: string; apiSource: 'coingecko' | 'yahoo' | 'manual' }> = {
  crypto: { label: 'Crypto', color: 'bg-orange-500', hexColor: '#f97316', apiSource: 'coingecko' },
  metals: { label: 'Metals', color: 'bg-yellow-500', hexColor: '#eab308', apiSource: 'yahoo' },
  stock: { label: 'Stocks', color: 'bg-blue-500', hexColor: '#3b82f6', apiSource: 'yahoo' },
  cash: { label: 'Cash', color: 'bg-gray-500', hexColor: '#6b7280', apiSource: 'manual' },
  seed: { label: 'Seed', color: 'bg-pink-500', hexColor: '#ec4899', apiSource: 'manual' },
}

export const CATEGORIES: AssetCategory[] = ['crypto', 'metals', 'stock', 'cash', 'seed']

export function formatCurrency(value: number, currency: Currency): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(value)
}
