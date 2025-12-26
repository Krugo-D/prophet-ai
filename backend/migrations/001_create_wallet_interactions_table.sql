-- Create wallet_interactions table
CREATE TABLE IF NOT EXISTS wallet_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  market_slug TEXT NOT NULL,
  market_title TEXT,
  category TEXT,
  interaction_type TEXT,
  amount NUMERIC,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallet_interactions_wallet_address ON wallet_interactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_interactions_category ON wallet_interactions(category);
CREATE INDEX IF NOT EXISTS idx_wallet_interactions_timestamp ON wallet_interactions(timestamp);


