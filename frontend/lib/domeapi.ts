// Client for DomeAPI (will be proxied through backend or called directly)
const DOME_API_KEY = process.env.NEXT_PUBLIC_DOME_API_KEY || '';

export interface Market {
  market_slug: string;
  title: string;
  category?: string;
  tags?: string[];
  status: 'open' | 'closed';
  volume_total?: number;
  side_a?: { id: string; name: string };
  side_b?: { id: string; name: string };
}

export interface MarketsResponse {
  markets: Market[];
  pagination?: {
    has_more: boolean;
    offset: number;
  };
}

// This will call the backend API which proxies to DomeAPI
// For now, we'll create an endpoint in the backend to fetch markets
export async function getActiveMarkets(params: {
  category?: string;
  limit?: number;
  offset?: number;
  min_volume?: number;
}): Promise<MarketsResponse> {
  const queryParams = new URLSearchParams();
  if (params.category) queryParams.append('category', params.category);
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());
  if (params.min_volume) queryParams.append('min_volume', params.min_volume.toString());

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002'}/markets?${queryParams}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch markets: ${response.statusText}`);
  }
  return response.json();
}

