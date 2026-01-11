import { useState } from 'react'

interface PasswordModalProps {
  mode: 'setup' | 'unlock'
  onSubmit: (password: string) => Promise<void>
  error?: string | null
}

export function PasswordModal({ mode, onSubmit, error }: PasswordModalProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (mode === 'setup' && password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    if (password.length < 4) {
      setLocalError('Password must be at least 4 characters')
      return
    }

    setLoading(true)
    try {
      await onSubmit(password)
    } finally {
      setLoading(false)
    }
  }

  const displayError = error || localError

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'setup' ? 'Create Password' : 'Unlock Portfolio'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'setup'
              ? 'Set a password to encrypt your portfolio data'
              : 'Enter your password to access your portfolio'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              required
            />
          </div>

          {mode === 'setup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}

          {displayError && (
            <p className="text-sm text-red-600">{displayError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'setup' ? 'Create' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}
