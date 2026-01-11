import { useState, useCallback } from 'react'
import type { Holding } from '@/types'

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function useHoldings(initialHoldings: Holding[] = []) {
  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings)

  const addHolding = useCallback((holding: Omit<Holding, 'id'>) => {
    const newHolding: Holding = { ...holding, id: generateId() }
    setHoldings(prev => [...prev, newHolding])
    return newHolding
  }, [])

  const updateHolding = useCallback((id: string, updates: Partial<Omit<Holding, 'id'>>) => {
    setHoldings(prev =>
      prev.map(h => (h.id === id ? { ...h, ...updates } : h))
    )
  }, [])

  const deleteHolding = useCallback((id: string) => {
    setHoldings(prev => prev.filter(h => h.id !== id))
  }, [])

  const setAllHoldings = useCallback((newHoldings: Holding[]) => {
    setHoldings(newHoldings)
  }, [])

  return {
    holdings,
    addHolding,
    updateHolding,
    deleteHolding,
    setAllHoldings,
  }
}
