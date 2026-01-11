import { useState, useCallback } from 'react'
import type { HistorySnapshot, HoldingWithValue } from '@/types'
import { createHistorySnapshot } from '@/services/storageService'

export function useHistory(initialHistory: HistorySnapshot[] = []) {
  const [history, setHistory] = useState<HistorySnapshot[]>(initialHistory)

  const addSnapshot = useCallback((holdings: HoldingWithValue[]) => {
    const snapshot = createHistorySnapshot(holdings)
    setHistory(prev => [...prev, snapshot])
    return snapshot
  }, [])

  const setAllHistory = useCallback((newHistory: HistorySnapshot[]) => {
    setHistory(newHistory)
  }, [])

  const deleteSnapshot = useCallback((index: number) => {
    setHistory(prev => prev.filter((_, i) => i !== index))
  }, [])

  return {
    history,
    addSnapshot,
    setAllHistory,
    deleteSnapshot,
  }
}
