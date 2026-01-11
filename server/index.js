import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'data', 'portfolio.enc')

const app = express()
app.use(cors())
app.use(express.json())

// Session state - password kept in memory while unlocked
let sessionPassword = null
let cachedData = null

// Crypto functions
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256')
}

function encrypt(data, password) {
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(12)
  const key = deriveKey(password, salt)

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const json = JSON.stringify(data)
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Format: salt (16) + iv (12) + authTag (16) + encrypted data
  return Buffer.concat([salt, iv, authTag, encrypted])
}

function decrypt(buffer, password) {
  const salt = buffer.subarray(0, 16)
  const iv = buffer.subarray(16, 28)
  const authTag = buffer.subarray(28, 44)
  const encrypted = buffer.subarray(44)

  const key = deriveKey(password, salt)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return JSON.parse(decrypted.toString('utf8'))
}

function loadEncryptedData(password) {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const buffer = fs.readFileSync(DATA_FILE)
      return decrypt(buffer, password)
    }
  } catch (error) {
    console.error('Failed to decrypt data:', error.message)
    return null
  }
  return { holdings: [], priceCache: {}, history: [] }
}

function saveEncryptedData(data, password) {
  try {
    const encrypted = encrypt(data, password)
    fs.writeFileSync(DATA_FILE, encrypted)
    return true
  } catch (error) {
    console.error('Failed to save encrypted data:', error)
    return false
  }
}

// Check database status
app.get('/api/status', (req, res) => {
  const exists = fs.existsSync(DATA_FILE)
  const unlocked = sessionPassword !== null
  res.json({ exists, unlocked })
})

// Setup initial password (first time)
app.post('/api/setup', (req, res) => {
  const { password } = req.body

  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' })
  }

  if (fs.existsSync(DATA_FILE)) {
    return res.status(400).json({ error: 'Database already exists' })
  }

  const emptyData = { holdings: [], priceCache: {}, history: [] }
  const success = saveEncryptedData(emptyData, password)

  if (success) {
    sessionPassword = password
    cachedData = emptyData
    res.json({ success: true, data: emptyData })
  } else {
    res.status(500).json({ error: 'Failed to create database' })
  }
})

// Unlock with password
app.post('/api/unlock', (req, res) => {
  const { password } = req.body

  if (!password) {
    return res.status(400).json({ error: 'Password required' })
  }

  const data = loadEncryptedData(password)

  if (data === null) {
    return res.status(401).json({ error: 'Invalid password' })
  }

  sessionPassword = password
  cachedData = data
  res.json({ success: true, data })
})

// Lock (clear session)
app.post('/api/lock', (req, res) => {
  sessionPassword = null
  cachedData = null
  res.json({ success: true })
})

// Middleware to check if unlocked
function requireUnlock(req, res, next) {
  if (!sessionPassword) {
    return res.status(401).json({ error: 'Database is locked' })
  }
  next()
}

// Get all portfolio data (requires unlock)
app.get('/api/portfolio', requireUnlock, (req, res) => {
  res.json(cachedData)
})

// Save all portfolio data (requires unlock)
app.put('/api/portfolio', requireUnlock, (req, res) => {
  cachedData = req.body
  const success = saveEncryptedData(cachedData, sessionPassword)

  if (success) {
    res.json({ success: true })
  } else {
    res.status(500).json({ error: 'Failed to save data' })
  }
})

// Export encrypted database file
app.get('/api/export', requireUnlock, (req, res) => {
  if (!fs.existsSync(DATA_FILE)) {
    return res.status(404).json({ error: 'No database file exists' })
  }

  const filename = `portfolio-${new Date().toISOString().split('T')[0]}.enc`
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Type', 'application/octet-stream')
  res.sendFile(DATA_FILE)
})

// Import encrypted database file
app.post('/api/import', requireUnlock, express.raw({ type: 'application/octet-stream', limit: '10mb' }), (req, res) => {
  try {
    // Verify the uploaded file can be decrypted with current password
    const data = decrypt(req.body, sessionPassword)

    if (!data.holdings || !Array.isArray(data.holdings)) {
      return res.status(400).json({ error: 'Invalid database file format' })
    }

    // Save the uploaded file
    fs.writeFileSync(DATA_FILE, req.body)
    cachedData = data

    res.json({ success: true, data })
  } catch (error) {
    res.status(400).json({ error: 'Cannot decrypt file with current password' })
  }
})

// Delete a history snapshot by index (requires unlock)
app.delete('/api/history/:index', requireUnlock, (req, res) => {
  const index = parseInt(req.params.index, 10)

  if (index < 0 || index >= cachedData.history.length) {
    return res.status(400).json({ error: 'Invalid index' })
  }

  cachedData.history.splice(index, 1)
  const success = saveEncryptedData(cachedData, sessionPassword)

  if (success) {
    res.json({ success: true, history: cachedData.history })
  } else {
    res.status(500).json({ error: 'Failed to save data' })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Portfolio server running on http://localhost:${PORT}`)
})
