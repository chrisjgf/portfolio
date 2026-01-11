# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
./start.sh          # Run both backend and frontend together
npm run dev         # Frontend only (Vite dev server on :5173)
npm run server      # Backend only (Express on :3001)
npm run build       # TypeScript check + Vite production build
```

## Architecture

This is a portfolio tracker with an encrypted backend database. Two processes run together:

**Frontend** (React 19 + Vite + Tailwind CSS 4)
- `src/App.tsx` - Main component, manages unlock flow and renders UI
- `src/hooks/` - State management: `useHoldings`, `usePrices`, `useHistory`
- `src/services/storageService.ts` - API calls to backend
- `src/services/priceService.ts` - CoinGecko (crypto) and Yahoo Finance (stocks/metals) price fetching

**Backend** (`server/index.js` - Express)
- AES-256-GCM encrypted JSON storage at `server/data/portfolio.enc`
- Password-protected: user must unlock on startup
- Session-based: password held in memory while unlocked

**Data Flow**
1. App checks `/api/status` to see if database exists and is unlocked
2. If locked, `PasswordModal` prompts for password
3. `/api/unlock` decrypts and returns portfolio data
4. Changes auto-save via `/api/portfolio` PUT endpoint

## Key Types (`src/types/index.ts`)

- `AssetCategory`: 'crypto' | 'metals' | 'stock' | 'cash' | 'seed'
- `Holding`: name, quantity, identifier (ticker/CoinGecko ID), optional manualPrice
- `PortfolioData`: holdings + history snapshots + price cache

## Code Style

- Use absolute imports with `@/` prefix (maps to `src/`)
- Functional style: prefer pure functions, avoid classes, use hooks for state
- Tailwind for all styling (no CSS files)
- Comment only where necessary - code should be self-explanatory
