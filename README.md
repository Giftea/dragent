# Dragent

An autonomous AI trading agent that runs on the [Kite Testnet](https://testnet.kitescan.ai). It uses Claude to generate trade signals, logs every decision on-chain with a cryptographic reason hash, and tracks agent reputation through a smart contract registry.

## Architecture

```
packages/
├── api/        Express API — agent runner, REST routes, DB access
├── core/       Shared TypeScript library — market data, strategy, ABIs
├── contracts/  Solidity contracts — TradeJournal, ReputationRegistry, AgentVaultFactory
├── web/        Next.js dashboard — create agents, view trades, PnL charts
└── subgraph/   Goldsky subgraph — indexes on-chain TradeLogged events
```

**Key contracts on Kite Testnet (chain ID 2368):**

| Contract | Address |
|---|---|
| TradeJournal | `0x94e7DAaeB4d28fF2e71912fd06818b41009de47e` |
| ReputationRegistry | `0x489A1C099971A14E793D2b38E07436ce7c1577C2` |
| AgentVaultFactory | `0xf5ADF21AF0574263A5DA7ADD0E47600ae60E647e` |

**Agent modes:**
- **Signal** — polls RSI + price trend via CoinGecko every 2 min, buys/sells when conditions match the configured strategy
- **Arb** — scans ETH/BTC/AVAX price spread between Kite and Avalanche every 5 min
- **Allocation** — monitors DeFi protocol yields and logs the best opportunity every 6 hours

Every trade decision is hashed and submitted to `TradeJournal.sol`. Five minutes later the agent settles the outcome (win/loss) on `ReputationRegistry.sol`.

## Prerequisites

- Node 20+
- npm 10+
- A PostgreSQL database (the project uses Supabase)
- An [Anthropic API key](https://console.anthropic.com)
- A funded wallet on [Kite Testnet](https://testnet.kitescan.ai) for gas

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Build the core package

The API depends on `@dragent/core` — build it first so the types are available:

```bash
npm run build --workspace=packages/core
```

### 3. Configure the API

Create `packages/api/.env`:

```env
# Kite Testnet
KITE_RPC=https://rpc-testnet.gokite.ai
PRIVATE_KEY=your_wallet_private_key

# Deployed contract addresses
TRADE_JOURNAL_ADDRESS=0x94e7DAaeB4d28fF2e71912fd06818b41009de47e
REPUTATION_REGISTRY_ADDRESS=0x489A1C099971A14E793D2b38E07436ce7c1577C2
AGENT_VAULT_FACTORY_ADDRESS=0xf5ADF21AF0574263A5DA7ADD0E47600ae60E647e
DUSD_ADDRESS=0x71390906e2FB696520F4eA4b14F5E818d11b36Dc

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Database (Supabase connection string)
DATABASE_URL=postgresql://user:password@host:5432/postgres

# Payment recipient for x402-gated routes
DRAGENT_PAYEE_ADDRESS=your_wallet_address

# Internal
NODE_ENV=development
API_BASE_URL=http://localhost:3001
```

### 4. Configure the web dashboard

Create `packages/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_GOLDSKY_URL=https://api.goldsky.com/api/public/project_<id>/subgraphs/dragent/v3/gn
API_BASE_URL=http://localhost:3001
```

### 5. Run the API

```bash
npm run dev --workspace=packages/api
# → 🐉 Dragent API running on port 3001
```

### 6. Run the web dashboard

In a separate terminal:

```bash
cd packages/web
npm install
npm run dev
# → http://localhost:3000
```

## Database schema

The API expects a PostgreSQL database with `users`, `agents`, and `trades` tables. Run the following to set it up:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  wallet TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  wallet TEXT NOT NULL,
  vault_address TEXT,
  strategy TEXT,
  rules JSONB DEFAULT '{}',
  status TEXT DEFAULT 'inactive',
  agent_modes JSONB DEFAULT '{"signal": true, "arb": false, "allocation": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES agents(id),
  trade_id BIGINT,
  asset TEXT,
  direction TEXT,
  size_usdc NUMERIC,
  price_usd NUMERIC,
  reason TEXT,
  reason_hash TEXT,
  tx_hash TEXT,
  won BOOLEAN,
  pnl_bps INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Smart contracts

Contracts are in `packages/contracts/contracts/`. They are already deployed on Kite Testnet — you only need to redeploy if you make changes.

```bash
cd packages/contracts

# Compile
npx hardhat compile

# Deploy (requires PRIVATE_KEY in packages/contracts/.env)
npm run deploy:factory
npm run wire:factory
```

`packages/contracts/.env`:

```env
PRIVATE_KEY=your_wallet_private_key
```

## API reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/agents` | Create agent + deploy vault |
| `POST` | `/api/agents/:id/start` | Start signal agent |
| `POST` | `/api/agents/:id/stop` | Stop signal agent |
| `POST` | `/api/agents/:id/arb/start` | Start arb agent |
| `POST` | `/api/agents/:id/allocation/start` | Start allocation agent |
| `GET` | `/api/agents/:id` | Agent status + on-chain stats + recent trades |
| `GET` | `/api/agents/:id/trades` | Last 50 trades from DB |
| `GET` | `/api/agents/:id/pnl` | PnL time series |
| `GET` | `/api/agents/:id/portfolio` | Portfolio breakdown by mode |
| `GET` | `/api/agents/by-wallet/:wallet` | Look up agent by user wallet |
| `PATCH` | `/api/agents/:id/strategy` | Update strategy + rules |
| `GET` | `/api/agents/reputation/:address` | On-chain reputation (x402 gated) |
| `GET` | `/health` | Health check |

## Deployment

The API is deployed on Railway using the `Dockerfile` in `packages/api/`. The web dashboard is deployed on Vercel.

Railway reads `railway.toml` at the repo root:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && rm -rf packages/core/dist packages/api/dist && npm run build"

[deploy]
startCommand = "node packages/api/dist/index.js"
restartPolicyType = "on_failure"
```

Set the same environment variables from step 3 in your Railway service dashboard before deploying.

## Links

- Kite Testnet explorer: https://testnet.kitescan.ai
- Kite RPC: https://rpc-testnet.gokite.ai (chain ID 2368)
