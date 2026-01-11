import { useState, useMemo } from 'react'
import type { HoldingWithValue, AssetCategory, Currency } from '@/types'
import { CATEGORY_CONFIG, CATEGORIES, formatCurrency } from '@/types'

interface DashboardProps {
  holdings: HoldingWithValue[]
  currency: Currency
  onCurrencyChange: (currency: Currency) => void
  lastUpdated: string | null
  isLoading: boolean
  onRefresh: () => void
}

interface PieChartProps {
  data: { category: AssetCategory; value: number; percentage: number }[]
}

function PieChart({ data }: PieChartProps): React.ReactElement | null {
  if (data.length === 0) return null

  let cumulative = 0
  const gradientStops = data
    .map(d => {
      const start = cumulative
      cumulative += d.percentage
      return `${CATEGORY_CONFIG[d.category].hexColor} ${start}% ${cumulative}%`
    })
    .join(', ')

  return (
    <div
      className="w-28 h-28 rounded-full flex-shrink-0"
      style={{ background: `conic-gradient(${gradientStops})` }}
    />
  )
}

export function Dashboard({ holdings, currency, onCurrencyChange, lastUpdated, isLoading, onRefresh }: DashboardProps): React.ReactElement {
  const [hoveredCategory, setHoveredCategory] = useState<AssetCategory | null>(null)
  const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0)

  const categoryData = useMemo(() => {
    const holdingsByCategory = new Map<AssetCategory, HoldingWithValue[]>()

    for (const holding of holdings) {
      const list = holdingsByCategory.get(holding.category) ?? []
      list.push(holding)
      holdingsByCategory.set(holding.category, list)
    }

    return CATEGORIES.map(category => {
      const categoryHoldings = holdingsByCategory.get(category) ?? []
      const value = categoryHoldings.reduce((sum, h) => sum + h.totalValue, 0)
      return {
        category,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        holdings: categoryHoldings.sort((a, b) => b.totalValue - a.totalValue),
      }
    }).filter(d => d.value > 0)
  }, [holdings, totalValue])

  const pieData = categoryData.map(({ category, value, percentage }) => ({ category, value, percentage }))

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-sm font-medium text-gray-500">Total Portfolio Value</h2>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalValue, currency)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            <button
              onClick={() => onCurrencyChange('USD')}
              className={`px-3 py-1 text-sm ${currency === 'USD' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              USD
            </button>
            <button
              onClick={() => onCurrencyChange('GBP')}
              className={`px-3 py-1 text-sm ${currency === 'GBP' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              GBP
            </button>
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-gray-500 mb-4">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}

      <div className="flex items-center gap-6">
        <PieChart data={pieData} />
        <div className="flex-1 space-y-3">
          {categoryData.map(({ category, value, percentage, holdings: categoryHoldings }) => {
            const config = CATEGORY_CONFIG[category]
            const isHovered = hoveredCategory === category

            return (
              <div key={category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{config.label}</span>
                  <span className="text-gray-600">
                    {formatCurrency(value, currency)} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div
                  className="w-full bg-gray-200 rounded-full h-2 relative cursor-pointer"
                  onMouseEnter={() => setHoveredCategory(category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <div
                    className={`${config.color} h-2 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                  {isHovered && (
                    <div className="absolute inset-0 h-2 flex rounded-full overflow-hidden">
                      {categoryHoldings.map((holding, idx) => (
                        <div
                          key={holding.id}
                          className={`${config.color} h-full`}
                          style={{ width: `${(holding.totalValue / value) * 100}%`, opacity: 1 - idx * 0.2 }}
                          title={`${holding.name}: ${formatCurrency(holding.totalValue, currency)}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
