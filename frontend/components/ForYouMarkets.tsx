'use client';

import { useState, useEffect } from 'react';
import { Market, getActiveMarkets } from '@/lib/domeapi';
import { WalletProfile } from '@/lib/api';

interface ForYouMarketsProps {
  userCategories: { [category: string]: { volume: number; interactions: number } };
}

export default function ForYouMarkets({ userCategories }: ForYouMarketsProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarkets() {
      try {
        setLoading(true);
        setError(null);

        // Get user's top categories by volume
        const topCategories = Object.entries(userCategories)
          .sort((a, b) => b[1].volume - a[1].volume)
          .slice(0, 5)
          .map(([category]) => category);

        // Fetch markets for each category and combine
        const allMarkets: Market[] = [];
        for (const category of topCategories) {
          try {
            const response = await getActiveMarkets({
              category,
              limit: 50,
              min_volume: 1000, // Minimum volume threshold
            });
            allMarkets.push(...response.markets.filter(m => m.status === 'open'));
          } catch (err) {
            console.error(`Error fetching markets for category ${category}:`, err);
          }
        }

        // Score and sort markets
        const scoredMarkets = allMarkets.map(market => {
          const categoryMatch = topCategories.indexOf(market.category || '');
          const categoryWeight = categoryMatch >= 0 ? (5 - categoryMatch) * 10 : 0; // Higher weight for top categories
          const volumeScore = (market.volume_total || 0) / 10000; // Normalize volume
          const score = categoryWeight + volumeScore;
          return { market, score };
        });

        // Sort by score and take top 20
        const topMarkets = scoredMarkets
          .sort((a, b) => b.score - a.score)
          .slice(0, 20)
          .map(item => item.market);

        setMarkets(topMarkets);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch markets');
      } finally {
        setLoading(false);
      }
    }

    if (Object.keys(userCategories).length > 0) {
      fetchMarkets();
    } else {
      setLoading(false);
    }
  }, [userCategories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading markets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No markets found. Make sure you have some trading history to get personalized recommendations.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">For You - Top Markets</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {markets.map((market) => (
          <div key={market.market_slug} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">{market.title}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {market.category && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{market.category}</span>
              )}
              {market.volume_total && (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                  ${(market.volume_total / 1000).toFixed(0)}k volume
                </span>
              )}
            </div>
            {market.side_a && market.side_b && (
              <div className="text-sm text-gray-600">
                <p>{market.side_a.name} vs {market.side_b.name}</p>
              </div>
            )}
            <a
              href={`https://polymarket.com/event/${market.market_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View on Polymarket →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

