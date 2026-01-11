import type { HoldingWithValue, Currency } from '@/types'
import { CATEGORY_CONFIG, formatCurrency } from '@/types'

interface HoldingsListProps {
  holdings: HoldingWithValue[]
  originalHoldings?: HoldingWithValue[]
  currency: Currency
  onEdit: (holding: HoldingWithValue) => void
  onDelete: (id: string) => void
  isPlanMode?: boolean
  onQuantityChange?: (id: string, newQuantity: number) => void
}

function getDelta(holding: HoldingWithValue, originalHoldings?: HoldingWithValue[]): number | null {
  if (!originalHoldings) return null
  const original = originalHoldings.find(o => o.id === holding.id)
  if (!original) return holding.totalValue
  return holding.totalValue - original.totalValue
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

export function HoldingsList({ holdings, originalHoldings, currency, onEdit, onDelete, isPlanMode, onQuantityChange }: HoldingsListProps) {
  if (holdings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        No holdings yet. Add your first holding to get started.
      </div>
    )
  }

  const sortedHoldings = [...holdings].sort((a, b) => b.totalValue - a.totalValue)

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
            {isPlanMode && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Delta</th>
            )}
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedHoldings.map(holding => {
            const config = CATEGORY_CONFIG[holding.category] ?? { label: holding.category, color: 'bg-gray-400' }
            return (
              <tr key={holding.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{holding.name}</div>
                  {holding.identifier && (
                    <div className="text-sm text-gray-500">{holding.identifier}</div>
                  )}
                  {isPlanMode && (
                    <input
                      type="number"
                      step="any"
                      value={holding.quantity}
                      onChange={(e) => onQuantityChange?.(holding.id, parseFloat(e.target.value) || 0)}
                      className="mt-1 w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${config.color}`}>
                    {config.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-gray-900">{formatCurrency(holding.currentPrice, currency)}</div>
                  {holding.priceSource === 'cached' && (
                    <div className="text-xs text-yellow-600">stale</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                  {formatCurrency(holding.totalValue, currency)}
                </td>
                {isPlanMode && (
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                    {(() => {
                      const delta = getDelta(holding, originalHoldings)
                      if (delta === null || delta === 0) return <span className="text-gray-400">-</span>
                      const isPositive = delta > 0
                      return (
                        <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                          {isPositive ? '+' : ''}{formatCurrency(delta, currency)}
                        </span>
                      )
                    })()}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => onEdit(holding)}
                    className="text-blue-600 hover:text-blue-900 p-1 mr-2"
                    title="Edit"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => onDelete(holding.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
