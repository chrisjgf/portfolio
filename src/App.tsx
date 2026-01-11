import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Holding, HoldingWithValue, PortfolioData, Currency, AssetCategory } from '@/types'
import { CATEGORY_CONFIG, CATEGORIES, formatCurrency } from '@/types'
import { useHoldings } from '@/hooks/useHoldings'
import { usePrices } from '@/hooks/usePrices'
import { useHistory } from '@/hooks/useHistory'
import { getStatus, setupPassword, unlockDatabase, saveToApi, saveToLocalStorage, deleteHistoryFromApi } from '@/services/storageService'
import type { DatabaseStatus } from '@/services/storageService'
import { PasswordModal } from '@/components/PasswordModal'
import { getUsdToGbpRate } from '@/services/priceService'
import { Dashboard } from '@/components/Dashboard'
import { HoldingsList } from '@/components/HoldingsList'
import { HoldingForm } from '@/components/HoldingForm'
import { ImportExport } from '@/components/ImportExport'

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg">
      {message}
    </div>
  )
}

function App() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingHolding, setEditingHolding] = useState<HoldingWithValue | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [currency, setCurrency] = useState<Currency>('USD')
  const [usdToGbp, setUsdToGbp] = useState(0.79)
  const [activeFilters, setActiveFilters] = useState<Set<AssetCategory>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const [isPlanMode, setIsPlanMode] = useState(false)
  const [plannedHoldings, setPlannedHoldings] = useState<Holding[]>([])

  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null)
  const [unlockError, setUnlockError] = useState<string | null>(null)

  const { holdings, addHolding, updateHolding, deleteHolding, setAllHoldings } = useHoldings()
  const { priceCache, isLoading, lastUpdated, refreshPrices, setAllPrices, getHoldingsWithValues } = usePrices()
  const { history, setAllHistory, addSnapshot, deleteSnapshot } = useHistory()

  useEffect(() => {
    async function checkStatusAndLoad() {
      const status = await getStatus()
      setDbStatus(status)

      if (status.unlocked) {
        try {
          const response = await fetch('http://localhost:3001/api/portfolio')
          if (response.ok) {
            const data = await response.json()
            setAllHoldings(data.holdings || [])
            setAllPrices(data.priceCache || {})
            setAllHistory(data.history || [])
            setInitialized(true)
          }
        } catch (error) {
          console.error('Failed to load portfolio:', error)
        }
      }
    }
    checkStatusAndLoad()
  }, [setAllHoldings, setAllPrices, setAllHistory])

  useEffect(() => {
    getUsdToGbpRate().then(setUsdToGbp)
  }, [])

  const handlePasswordSubmit = useCallback(async (password: string) => {
    setUnlockError(null)

    if (!dbStatus?.exists) {
      const result = await setupPassword(password)
      if (result.success && result.data) {
        setAllHoldings(result.data.holdings)
        setAllPrices(result.data.priceCache)
        setAllHistory(result.data.history)
        setDbStatus({ exists: true, unlocked: true })
        setInitialized(true)
      } else {
        setUnlockError(result.error || 'Setup failed')
      }
    } else {
      const result = await unlockDatabase(password)
      if (result.success && result.data) {
        setAllHoldings(result.data.holdings)
        setAllPrices(result.data.priceCache)
        setAllHistory(result.data.history)
        setDbStatus({ exists: true, unlocked: true })
        setInitialized(true)
      } else {
        setUnlockError(result.error || 'Invalid password')
      }
    }
  }, [dbStatus, setAllHoldings, setAllPrices, setAllHistory])

  useEffect(() => {
    if (!initialized || isPlanMode) return

    const data: PortfolioData = {
      holdings,
      priceCache,
      history,
    }
    saveToApi(data)
    saveToLocalStorage(data)
  }, [holdings, priceCache, history, initialized, isPlanMode])

  useEffect(() => {
    if (!initialized || holdings.length === 0) return
    refreshPrices(holdings)
  }, [initialized, holdings.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const holdingsWithValuesUsd = getHoldingsWithValues(holdings)

  const holdingsWithValues = useMemo(() => {
    if (currency === 'USD') return holdingsWithValuesUsd

    return holdingsWithValuesUsd.map(h => ({
      ...h,
      currentPrice: h.currentPrice * usdToGbp,
      totalValue: h.totalValue * usdToGbp,
    }))
  }, [holdingsWithValuesUsd, currency, usdToGbp])

  const categoriesWithHoldings = useMemo(() => {
    const cats = new Set(holdingsWithValues.map(h => h.category))
    return CATEGORIES.filter(c => cats.has(c))
  }, [holdingsWithValues])

  const filteredHoldings = useMemo(() => {
    if (activeFilters.size === 0) return holdingsWithValues
    return holdingsWithValues.filter(h => activeFilters.has(h.category))
  }, [holdingsWithValues, activeFilters])

  const plannedHoldingsWithValues = useMemo(() => {
    if (!isPlanMode) return []
    const withValuesUsd = getHoldingsWithValues(plannedHoldings)
    if (currency === 'USD') return withValuesUsd
    return withValuesUsd.map(h => ({
      ...h,
      currentPrice: h.currentPrice * usdToGbp,
      totalValue: h.totalValue * usdToGbp,
    }))
  }, [isPlanMode, plannedHoldings, getHoldingsWithValues, currency, usdToGbp])

  const filteredPlannedHoldings = useMemo(() => {
    if (activeFilters.size === 0) return plannedHoldingsWithValues
    return plannedHoldingsWithValues.filter(h => activeFilters.has(h.category))
  }, [plannedHoldingsWithValues, activeFilters])

  const toggleFilter = useCallback((category: AssetCategory) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  const handleRefreshPrices = useCallback(async () => {
    await refreshPrices(holdings)
    const rate = await getUsdToGbpRate()
    setUsdToGbp(rate)
  }, [refreshPrices, holdings])

  const handleAddHolding = useCallback(() => {
    setEditingHolding(null)
    setIsFormOpen(true)
  }, [])

  const handleEditHolding = useCallback((holding: HoldingWithValue) => {
    setEditingHolding(holding)
    setIsFormOpen(true)
  }, [])

  const handleSaveHolding = useCallback((holdingData: Omit<Holding, 'id'>) => {
    if (isPlanMode) {
      if (editingHolding) {
        setPlannedHoldings(prev =>
          prev.map(h => h.id === editingHolding.id ? { ...h, ...holdingData } : h)
        )
      } else {
        const newHolding: Holding = {
          ...holdingData,
          id: Math.random().toString(36).substring(2, 9),
        }
        setPlannedHoldings(prev => [...prev, newHolding])
      }
    } else {
      if (editingHolding) {
        updateHolding(editingHolding.id, holdingData)
      } else {
        addHolding(holdingData)
      }
    }
    setIsFormOpen(false)
    setEditingHolding(null)
  }, [editingHolding, addHolding, updateHolding, isPlanMode])

  const handleDeleteHolding = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this holding?')) {
      deleteHolding(id)
    }
  }, [deleteHolding])

  const handleImport = useCallback((data: PortfolioData) => {
    setAllHoldings(data.holdings)
    setAllPrices(data.priceCache)
    setAllHistory(data.history)
    setToast('Portfolio imported successfully')
  }, [setAllHoldings, setAllPrices, setAllHistory])

  const handleExport = useCallback(() => setToast('Portfolio exported'), [])

  const handleEnterPlanMode = useCallback(() => {
    setPlannedHoldings([...holdings])
    setIsPlanMode(true)
  }, [holdings])

  const handleAcceptPlan = useCallback(() => {
    setAllHoldings(plannedHoldings)
    setIsPlanMode(false)
    setPlannedHoldings([])
    setToast('Changes applied')
  }, [plannedHoldings, setAllHoldings])

  const handleCancelPlan = useCallback(() => {
    setIsPlanMode(false)
    setPlannedHoldings([])
  }, [])

  const handlePlanQuantityChange = useCallback((id: string, newQuantity: number) => {
    setPlannedHoldings(prev =>
      prev.map(h => h.id === id ? { ...h, quantity: newQuantity } : h)
    )
  }, [])

  const handlePlanDeleteHolding = useCallback((id: string) => {
    if (confirm('Remove this holding from the plan?')) {
      setPlannedHoldings(prev => prev.filter(h => h.id !== id))
    }
  }, [])

  const handleSaveSnapshot = useCallback(() => {
    addSnapshot(holdingsWithValuesUsd) // Always save in USD
    setToast('Snapshot saved')
  }, [addSnapshot, holdingsWithValuesUsd])

  const handleDeleteSnapshot = useCallback(async (index: number) => {
    deleteSnapshot(index)
    await deleteHistoryFromApi(index)
    setToast('Snapshot deleted')
  }, [deleteSnapshot])

  if (dbStatus === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!dbStatus.unlocked) {
    return (
      <PasswordModal
        mode={dbStatus.exists ? 'unlock' : 'setup'}
        onSubmit={handlePasswordSubmit}
        error={unlockError}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Tracker</h1>
          <div className="flex gap-3">
            <button
              onClick={handleSaveSnapshot}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Save Snapshot
            </button>
            <ImportExport data={{ holdings, priceCache, history }} onImport={handleImport} onExport={handleExport} />
          </div>
        </header>

        <Dashboard
          holdings={holdingsWithValues}
          currency={currency}
          onCurrencyChange={setCurrency}
          lastUpdated={lastUpdated}
          isLoading={isLoading}
          onRefresh={handleRefreshPrices}
        />

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Holdings</h2>
            {categoriesWithHoldings.length > 1 && (
              <div className="flex gap-1">
                {categoriesWithHoldings.map(cat => {
                  const config = CATEGORY_CONFIG[cat]
                  const isActive = activeFilters.has(cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleFilter(cat)}
                      className={`px-2 py-1 text-xs rounded-full transition-all ${
                        isActive
                          ? `${config.color} text-white`
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {config.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {isPlanMode ? (
              <>
                <button
                  onClick={handleCancelPlan}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptPlan}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Accept Changes
                </button>
              </>
            ) : (
              <button
                onClick={handleEnterPlanMode}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
              >
                Plan
              </button>
            )}
            <button
              onClick={handleAddHolding}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              + Add Holding
            </button>
          </div>
        </div>

        <HoldingsList
          holdings={isPlanMode ? filteredPlannedHoldings : filteredHoldings}
          originalHoldings={isPlanMode ? filteredHoldings : undefined}
          currency={currency}
          onEdit={handleEditHolding}
          onDelete={isPlanMode ? handlePlanDeleteHolding : handleDeleteHolding}
          isPlanMode={isPlanMode}
          onQuantityChange={handlePlanQuantityChange}
        />

        {history.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              History ({history.length} snapshots)
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...history].reverse().map((snapshot, i) => {
                const actualIndex = history.length - 1 - i
                return (
                  <div key={i} className="flex justify-between items-center text-sm text-gray-600">
                    <span>{new Date(snapshot.date).toLocaleString()}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {formatCurrency(currency === 'USD' ? snapshot.totalValue : snapshot.totalValue * usdToGbp, currency)}
                      </span>
                      <button
                        onClick={() => handleDeleteSnapshot(actualIndex)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete snapshot"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {isFormOpen && (
          <HoldingForm
            holding={editingHolding}
            onSave={handleSaveHolding}
            onCancel={() => {
              setIsFormOpen(false)
              setEditingHolding(null)
            }}
          />
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

export default App
