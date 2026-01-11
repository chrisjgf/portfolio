import type { PortfolioData, HoldingWithValue, HistorySnapshot, AssetCategory } from '@/types'

const STORAGE_KEY = 'portfolio-tracker-data'
const API_BASE = 'http://localhost:3001/api'

export interface DatabaseStatus {
  exists: boolean
  unlocked: boolean
}

export async function getStatus(): Promise<DatabaseStatus> {
  try {
    const response = await fetch(`${API_BASE}/status`)
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error('Failed to get status:', error)
  }
  return { exists: false, unlocked: false }
}

export async function setupPassword(password: string): Promise<{ success: boolean; data?: PortfolioData; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    const result = await response.json()
    if (response.ok) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
  } catch (error) {
    return { success: false, error: 'Failed to connect to server' }
  }
}

export async function unlockDatabase(password: string): Promise<{ success: boolean; data?: PortfolioData; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    const result = await response.json()
    if (response.ok) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
  } catch (error) {
    return { success: false, error: 'Failed to connect to server' }
  }
}

export async function saveToApi(data: PortfolioData): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/portfolio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.ok
  } catch (error) {
    console.error('Failed to save to API:', error)
    return false
  }
}

export async function deleteHistoryFromApi(index: number): Promise<HistorySnapshot[] | null> {
  try {
    const response = await fetch(`${API_BASE}/history/${index}`, {
      method: 'DELETE'
    })
    if (response.ok) {
      const result = await response.json()
      return result.history
    }
  } catch (error) {
    console.error('Failed to delete history from API:', error)
  }
  return null
}

export function loadFromLocalStorage(): PortfolioData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored) as PortfolioData
      return data
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
  }
  return null
}

export function saveToLocalStorage(data: PortfolioData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

export async function exportDatabase(): Promise<void> {
  const response = await fetch(`${API_BASE}/export`)
  if (!response.ok) {
    throw new Error('Failed to export database')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `portfolio-${new Date().toISOString().split('T')[0]}.enc`
  link.click()
  URL.revokeObjectURL(url)
}

export async function importDatabase(file: File): Promise<PortfolioData> {
  const response = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to import database')
  }

  const result = await response.json()
  return result.data
}

export function createHistorySnapshot(
  holdings: HoldingWithValue[]
): HistorySnapshot {
  const categoryValues: Record<AssetCategory, number> = {
    crypto: 0,
    metals: 0,
    stock: 0,
    cash: 0,
    seed: 0,
  }
  let totalValue = 0

  for (const holding of holdings) {
    categoryValues[holding.category] += holding.totalValue
    totalValue += holding.totalValue
  }

  return {
    date: new Date().toISOString(),
    totalValue,
    categoryValues,
  }
}
