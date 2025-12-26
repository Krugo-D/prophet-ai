# Prophet - Polymarket Wallet Profile API

A NestJS server that connects to Supabase PostgreSQL to store and query Polymarket wallet interactions, providing wallet profiles categorized by market types.

## Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
# Supabase Configuration
SUPABASE_URL=https://uypxlnmivfdfvygqkniq.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# DomeAPI Configuration
DOME_API_KEY=238fb04912cbd3101ae1d412e91be443fad98df7

# Database Connection
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.uypxlnmivfdfvygqkniq.supabase.co:5432/postgres
```

### 3. Set Up Database

Apply the migration to create the `wallet_interactions` table:

```bash
# The migration file is in migrations/001_create_wallet_interactions_table.sql
# Apply it via Supabase dashboard or using the MCP tools
```

### 4. Run the Application

```bash
# Development mode (with hot reload)
yarn start:dev

# Production mode
yarn build
yarn start
```

The server will run on `http://localhost:3000`

### 5. Populate Initial Data

```bash
yarn populate
```

This script will fetch sample wallet interactions and store them in the database.

## API Endpoints

### Get Wallet Profile

```
GET /wallet-profile/:walletAddress
```

Returns a profile showing how much a wallet has interacted with different market categories.

**Example:**
```bash
curl http://localhost:3000/wallet-profile/0x1234567890123456789012345678901234567890
```

**Response:**
```json
{
  "wallet": "0x1234567890123456789012345678901234567890",
  "categories": {
    "Politics": 15,
    "Sports": 8,
    "Crypto": 12,
    "Entertainment": 5
  },
  "totalInteractions": 40
}
```

## Project Structure

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module
├── config/
│   └── configuration.ts             # Configuration setup
├── database/
│   ├── database.module.ts          # Database module
│   └── supabase.service.ts         # Supabase client service
├── domeapi/
│   ├── domeapi.module.ts           # DomeAPI module
│   └── domeapi.service.ts          # DomeAPI client service
├── wallet-interactions/
│   ├── wallet-interactions.module.ts
│   └── wallet-interactions.service.ts  # Service to store/retrieve interactions
├── wallet-profile/
│   ├── wallet-profile.module.ts
│   ├── wallet-profile.controller.ts    # REST endpoint
│   ├── wallet-profile.service.ts       # Aggregation logic
│   └── dto/
│       └── wallet-profile.dto.ts       # Response DTO
└── scripts/
    └── populate-wallet-data.ts     # Data population script
```

## Database Schema

### wallet_interactions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| wallet_address | TEXT | Wallet address (indexed) |
| market_slug | TEXT | Market identifier |
| market_title | TEXT | Market title |
| category | TEXT | Market category (indexed) |
| interaction_type | TEXT | Type of interaction (trade, position, etc.) |
| amount | NUMERIC | Interaction amount |
| timestamp | TIMESTAMPTZ | When the interaction occurred |
| created_at | TIMESTAMPTZ | Record creation time |

## Next Steps

1. Integrate actual DomeAPI wallet interaction endpoints
2. Add more sophisticated aggregation logic
3. Add pagination and filtering to the API
4. Add authentication/rate limiting
5. Add caching for frequently accessed wallets


