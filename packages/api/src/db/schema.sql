CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  wallet     VARCHAR(42) UNIQUE NOT NULL,
  email      VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id),
  wallet        VARCHAR(42) UNIQUE NOT NULL,
  vault_address VARCHAR(42),
  strategy      TEXT NOT NULL,
  rules         JSONB,
  status        VARCHAR(20) DEFAULT 'inactive',
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trades (
  id          SERIAL PRIMARY KEY,
  agent_id    INTEGER REFERENCES agents(id),
  trade_id    INTEGER,
  asset       VARCHAR(20) NOT NULL,
  direction   VARCHAR(4)  NOT NULL,
  size_usdc   NUMERIC,
  price_usd   NUMERIC,
  reason      TEXT,
  reason_hash VARCHAR(66),
  tx_hash     VARCHAR(66),
  won         BOOLEAN,
  pnl_bps     INTEGER,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_agent_id ON trades(agent_id);
CREATE INDEX IF NOT EXISTS idx_trades_trade_id ON trades(trade_id);