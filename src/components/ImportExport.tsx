import { useRef } from 'react'
import type { PortfolioData } from '@/types'
import { exportDatabase, importDatabase } from '@/services/storageService'

interface ImportExportProps {
  data: PortfolioData
  onImport: (data: PortfolioData) => void
  onExport?: () => void
}

export function ImportExport({ onImport, onExport }: ImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    try {
      await exportDatabase()
      onExport?.()
    } catch (error) {
      alert('Failed to export: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imported = await importDatabase(file)
      onImport(imported)
    } catch (error) {
      alert('Failed to import: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }

    // Reset input
    e.target.value = ''
  }

  return (
    <div className="flex gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".enc"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleImportClick}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
      >
        Import
      </button>
      <button
        onClick={handleExport}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
      >
        Export
      </button>
    </div>
  )
}
