# Portfolio Tracker

A personal portfolio tracker with encrypted local storage. Track crypto, stocks, precious metals, and other assets with automatic price fetching.

## Features

- **Encrypted storage** - AES-256-GCM encrypted database, password-protected
- **Live prices** - CoinGecko (crypto) and Yahoo Finance (stocks/metals)
- **Multi-asset support** - Crypto, stocks, metals, cash, seed phrases
- **History tracking** - Portfolio value snapshots over time

## Tech Stack

- React 19 + TypeScript
- Tailwind CSS 4
- Vite
- Express backend

## Getting Started

```bash
bun install
./start.sh
```

This runs both the frontend (port 5173) and backend (port 3001). On first launch, you'll create a password to encrypt your portfolio data.

## Scripts

```bash
./start.sh        # Run full app
bun run dev       # Frontend only
bun run server    # Backend only
bun run build     # Production build
```
