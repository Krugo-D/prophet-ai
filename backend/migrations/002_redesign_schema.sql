-- Migration 002: Redesign schema for granular wallet data with PnL tracking
-- This replaces the old wallet_interactions table with a proper normalized schema

-- Step 1: Create markets dimension table
CREATE TABLE IF NOT EXISTS markets (
  market_slug TEXT PRIMARY KEY,
  title TEXT,
  condition_id TEXT,
  category TEXT,
  tags TEXT[], -- Array of tags
  status TEXT CHECK (status IN ('open', 'closed')),
  winning_side TEXT, -- 'side_a' or 'side_b' or null
  side_a_id TEXT,
  side_b_id TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  completed_time TIMESTAMPTZ,
  volume_total NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_condition_id ON markets(condition_id);

-- Step 2: Create wallet_transactions fact table (raw transaction data)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  market_slug TEXT NOT NULL REFERENCES markets(market_slug),
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  price NUMERIC NOT NULL, -- Price per share
  shares NUMERIC NOT NULL, -- Raw shares
  shares_normalized NUMERIC NOT NULL, -- Normalized shares
  volume_usd NUMERIC NOT NULL, -- price × shares_normalized
  token_id TEXT,
  condition_id TEXT,
  tx_hash TEXT,
  order_hash TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_market ON wallet_transactions(market_slug);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_timestamp ON wallet_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_market ON wallet_transactions(wallet_address, market_slug);

-- Step 3: Create wallet_market_summary (aggregated per wallet per market)
CREATE TABLE IF NOT EXISTS wallet_market_summary (
  wallet_address TEXT NOT NULL,
  market_slug TEXT NOT NULL REFERENCES markets(market_slug),
  total_volume_buy NUMERIC DEFAULT 0,
  total_volume_sell NUMERIC DEFAULT 0,
  total_volume NUMERIC DEFAULT 0, -- BUY + SELL combined
  total_interactions INTEGER DEFAULT 0,
  net_shares NUMERIC DEFAULT 0, -- BUY shares - SELL shares
  first_interaction TIMESTAMPTZ,
  last_interaction TIMESTAMPTZ,
  pnl NUMERIC, -- Only for finalized markets, NULL for open
  is_finalized BOOLEAN DEFAULT FALSE,
  winning_side_held BOOLEAN, -- True if wallet holds winning side (if finalized)
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (wallet_address, market_slug)
);

CREATE INDEX IF NOT EXISTS idx_wallet_market_summary_wallet ON wallet_market_summary(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_market_summary_market ON wallet_market_summary(market_slug);
CREATE INDEX IF NOT EXISTS idx_wallet_market_summary_category ON wallet_market_summary(wallet_address, market_slug);

-- Step 4: Create wallet_category_summary (aggregated per wallet per category)
CREATE TABLE IF NOT EXISTS wallet_category_summary (
  wallet_address TEXT NOT NULL,
  category TEXT NOT NULL,
  total_volume NUMERIC DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  finalized_markets_count INTEGER DEFAULT 0,
  open_markets_count INTEGER DEFAULT 0,
  pnl NUMERIC DEFAULT 0, -- Sum of PnL from finalized markets only
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (wallet_address, category)
);

CREATE INDEX IF NOT EXISTS idx_wallet_category_summary_wallet ON wallet_category_summary(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_category_summary_category ON wallet_category_summary(category);

-- Step 5: Migrate existing data (if any) from old table
-- Note: We'll lose price data for existing records, but can backfill from API if needed
INSERT INTO markets (market_slug, title, category, status)
SELECT DISTINCT 
  market_slug,
  market_title,
  category,
  'open' -- Default status, will be updated when we fetch market details
FROM wallet_interactions
ON CONFLICT (market_slug) DO NOTHING;

-- Step 6: Create function to update wallet_market_summary
CREATE OR REPLACE FUNCTION update_wallet_market_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallet_market_summary (
    wallet_address,
    market_slug,
    total_volume_buy,
    total_volume_sell,
    total_volume,
    total_interactions,
    net_shares,
    first_interaction,
    last_interaction
  )
  SELECT 
    wallet_address,
    market_slug,
    COALESCE(SUM(CASE WHEN side = 'BUY' THEN volume_usd ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN side = 'SELL' THEN volume_usd ELSE 0 END), 0),
    COALESCE(SUM(volume_usd), 0),
    COUNT(*),
    COALESCE(SUM(CASE WHEN side = 'BUY' THEN shares_normalized ELSE -shares_normalized END), 0),
    MIN(timestamp),
    MAX(timestamp)
  FROM wallet_transactions
  WHERE wallet_address = NEW.wallet_address AND market_slug = NEW.market_slug
  GROUP BY wallet_address, market_slug
  ON CONFLICT (wallet_address, market_slug) 
  DO UPDATE SET
    total_volume_buy = EXCLUDED.total_volume_buy,
    total_volume_sell = EXCLUDED.total_volume_sell,
    total_volume = EXCLUDED.total_volume,
    total_interactions = EXCLUDED.total_interactions,
    net_shares = EXCLUDED.net_shares,
    first_interaction = EXCLUDED.first_interaction,
    last_interaction = EXCLUDED.last_interaction,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to auto-update wallet_market_summary
DROP TRIGGER IF EXISTS trigger_update_wallet_market_summary ON wallet_transactions;
CREATE TRIGGER trigger_update_wallet_market_summary
  AFTER INSERT OR UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_market_summary();

-- Step 8: Create function to update wallet_category_summary
CREATE OR REPLACE FUNCTION update_wallet_category_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallet_category_summary (
    wallet_address,
    category,
    total_volume,
    total_interactions,
    finalized_markets_count,
    open_markets_count
  )
  SELECT 
    wms.wallet_address,
    m.category,
    COALESCE(SUM(wms.total_volume), 0),
    COALESCE(SUM(wms.total_interactions), 0),
    COUNT(CASE WHEN wms.is_finalized = TRUE THEN 1 END),
    COUNT(CASE WHEN wms.is_finalized = FALSE THEN 1 END)
  FROM wallet_market_summary wms
  JOIN markets m ON wms.market_slug = m.market_slug
  WHERE wms.wallet_address = (
    SELECT wallet_address FROM wallet_transactions WHERE id = NEW.id LIMIT 1
  )
  GROUP BY wms.wallet_address, m.category
  ON CONFLICT (wallet_address, category)
  DO UPDATE SET
    total_volume = EXCLUDED.total_volume,
    total_interactions = EXCLUDED.total_interactions,
    finalized_markets_count = EXCLUDED.finalized_markets_count,
    open_markets_count = EXCLUDED.open_markets_count,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger to auto-update wallet_category_summary
DROP TRIGGER IF EXISTS trigger_update_wallet_category_summary ON wallet_transactions;
CREATE TRIGGER trigger_update_wallet_category_summary
  AFTER INSERT OR UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_category_summary();


