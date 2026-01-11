import { useState, useEffect } from 'react'
import type { Holding, AssetCategory } from '@/types'
import { CATEGORY_CONFIG, CATEGORIES } from '@/types'

interface HoldingFormProps {
  holding?: Holding | null
  onSave: (holding: Omit<Holding, 'id'>) => void
  onCancel: () => void
}

export function HoldingForm({ holding, onSave, onCancel }: HoldingFormProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<AssetCategory>('stock')
  const [quantity, setQuantity] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [manualPrice, setManualPrice] = useState('')

  useEffect(() => {
    if (holding) {
      setName(holding.name)
      setCategory(holding.category)
      setQuantity(holding.quantity.toString())
      setIdentifier(holding.identifier ?? '')
      setManualPrice(holding.manualPrice?.toString() ?? '')
    }
  }, [holding])

  const isManualCategory = category === 'cash' || category === 'seed'
  const config = CATEGORY_CONFIG[category]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const parsedManualPrice = parseFloat(manualPrice)
    const newHolding: Omit<Holding, 'id'> = {
      name,
      category,
      quantity: parseFloat(quantity) || 0,
      identifier: identifier || undefined,
      manualPrice: parsedManualPrice > 0 ? parsedManualPrice : undefined,
    }

    onSave(newHolding)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          {holding ? 'Edit Holding' : 'Add Holding'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Bitcoin, Tesla, Vanguard LifeStrategy"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as AssetCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {CATEGORY_CONFIG[cat].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="e.g., 0.5, 10, 1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {!isManualCategory && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {config.apiSource === 'coingecko' ? 'CoinGecko ID' : 'Ticker/Symbol'}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder={
                  config.apiSource === 'coingecko'
                    ? 'e.g., bitcoin, ethereum, aave'
                    : 'e.g., TSLA, SGLN, VUAG'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {config.apiSource === 'coingecko'
                  ? 'Find IDs at coingecko.com (lowercase)'
                  : 'UK tickers auto-add .L suffix'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isManualCategory ? 'Price per unit (USD)' : 'Manual price override (USD, optional)'}
            </label>
            <input
              type="number"
              step="any"
              value={manualPrice}
              onChange={e => setManualPrice(e.target.value)}
              placeholder={isManualCategory ? 'e.g., 1.27 for £1 cash' : 'Leave empty to use live price'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {!isManualCategory && (
              <p className="text-xs text-gray-500 mt-1">
                Use this if API price is wrong or unavailable
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {holding ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
