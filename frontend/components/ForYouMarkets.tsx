'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';

interface MarketRecommendation {
  market_slug: string;
  title: string;
  category: string;
  volume_total: number;
  status: string;
  reason: string;
  match_score?: number;
  image_url?: string;
  outcomes?: { id: string; label: string; price: number }[];
  end_time?: string;
}

interface ForYouMarketsProps {
  walletAddress?: string;
}

export default function ForYouMarkets({ walletAddress: propWalletAddress }: ForYouMarketsProps) {
  const { activeWallet } = useWallet();
  const [recommendations, setRecommendations] = useState<MarketRecommendation[]>([]);
  const [bookmarkedMarkets, setBookmarkedMarkets] = useState<MarketRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState<'for-you' | 'bookmarks'>('for-you');
  
  // Local cache to prevent redundant API calls
  const cache = useRef<{
    recommendations: { [wallet: string]: MarketRecommendation[] };
    bookmarks: { [slugs: string]: MarketRecommendation[] };
  }>({
    recommendations: {},
    bookmarks: {}
  });

  // Load bookmarks from localStorage on mount ONLY
  useEffect(() => {
    const saved = localStorage.getItem('prophet_bookmarks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBookmarks(parsed);
      } catch (e) {
        console.error('Failed to parse bookmarks', e);
      }
    }
  }, []);

  const toggleBookmark = (slug: string) => {
    setBookmarks(prev => {
      const newBookmarks = prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug];
      localStorage.setItem('prophet_bookmarks', JSON.stringify(newBookmarks));
      return newBookmarks;
    });
  };

  // Use prop wallet address or global active wallet
  const activeWalletAddress = propWalletAddress || activeWallet;

  // Effect for fetching recommendations - only when wallet changes
  useEffect(() => {
    if (activeWalletAddress) {
      // Check cache first
      if (cache.current.recommendations[activeWalletAddress]) {
        setRecommendations(cache.current.recommendations[activeWalletAddress]);
      } else {
        fetchRecommendations(activeWalletAddress);
      }
    }
  }, [activeWalletAddress]);

  // Effect for fetching bookmarks - only when tab changes to bookmarks or bookmarks significantly change
  useEffect(() => {
    if (currentTab === 'bookmarks') {
      const bookmarkKey = [...bookmarks].sort().join(',');
      if (cache.current.bookmarks[bookmarkKey]) {
        setBookmarkedMarkets(cache.current.bookmarks[bookmarkKey]);
      } else {
        fetchBookmarkedMarkets();
      }
    }
  }, [currentTab, bookmarks.length]);

  const fetchRecommendations = async (wallet: string) => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';
      const response = await fetch(`${apiUrl}/markets/recommendations/${wallet}?limit=24`);
      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
      }
      const data = await response.json();
      const recs = data.recommendations || [];
      setRecommendations(recs);
      // Update cache
      cache.current.recommendations[wallet] = recs;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarkedMarkets = async () => {
    if (bookmarks.length === 0) {
      setBookmarkedMarkets([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const slugs = bookmarks.join(',');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';
      const response = await fetch(`${apiUrl}/markets/by-slugs?slugs=${slugs}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch bookmarked markets: ${response.statusText}`);
      }
      const data = await response.json();
      const markets = data.markets || [];
      setBookmarkedMarkets(markets);
      // Update cache
      const bookmarkKey = [...bookmarks].sort().join(',');
      cache.current.bookmarks[bookmarkKey] = markets;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookmarked markets');
      setBookmarkedMarkets([]);
    } finally {
      setLoading(false);
    }
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}m`;
    if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}k`;
    return `$${vol.toFixed(0)}`;
  };

  // Filter bookmarked markets locally for the UI when in bookmarks tab
  const displayMarkets = currentTab === 'for-you' 
    ? recommendations 
    : bookmarkedMarkets.filter(m => bookmarks.includes(m.market_slug));

  return (
    <div className="w-full space-y-6">
      {/* Background is handled by the page wrapper, but we want the cards to stand out */}
      <div className="bg-[#0f0f23] p-6 rounded-2xl shadow-xl border border-gray-800/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">For You</h2>
            <p className="text-gray-400 text-sm">
              Personalized recommendations and your bookmarked markets
            </p>
          </div>
          
          {/* Tab Switcher - Styled like Polymarket */}
          <div className="flex bg-[#1a1a3a] p-1 rounded-xl w-fit border border-gray-800">
            <button
              onClick={() => setCurrentTab('for-you')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                currentTab === 'for-you'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Recommendations
            </button>
            <button
              onClick={() => setCurrentTab('bookmarks')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                currentTab === 'bookmarks'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Bookmarks
              {bookmarks.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  currentTab === 'bookmarks' ? 'bg-indigo-400 text-white' : 'bg-gray-700 text-gray-300'
                }`}>
                  {bookmarks.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeWalletAddress || currentTab === 'bookmarks' ? (
          <div>
            {loading && displayMarkets.length === 0 && (
              <div className="text-center text-gray-400 py-20">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-indigo-500 rounded-full mb-4"></div>
                <p className="font-medium">Curating markets for you...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-4 rounded-xl mb-6 text-center">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            {!loading && displayMarkets.length === 0 && (
              <div className="text-center text-gray-400 py-20 bg-[#1a1a3a]/30 rounded-2xl border border-dashed border-gray-800">
                {currentTab === 'for-you' ? (
                  <>
                    <div className="text-5xl mb-4 opacity-50">🔍</div>
                    <p className="text-lg font-medium">No recommendations yet.</p>
                    <p className="text-sm opacity-60">Try connecting a wallet with more trading history.</p>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-4 opacity-50">🔖</div>
                    <p className="text-lg font-medium">Your watchlist is empty.</p>
                    <p className="text-sm opacity-60 mb-6">Bookmark markets to track them here.</p>
                    <button 
                      onClick={() => setCurrentTab('for-you')}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                    >
                      Explore Recommendations
                    </button>
                  </>
                )}
              </div>
            )}

            {displayMarkets.length > 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {displayMarkets.map((market) => {
                    const isBookmarked = bookmarks.includes(market.market_slug);
                    return (
                      <div
                        key={market.market_slug}
                        className="group flex flex-col bg-[#2d2d4f] border border-gray-700/50 rounded-xl overflow-hidden hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(79,70,229,0.1)] transition-all duration-300"
                      >
                        <div className="p-4 flex-1">
                          {/* Header */}
                          <div className="flex gap-2 items-start mb-6">
                            <div className="w-10 h-10 rounded-lg bg-[#1a1a3a] flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-700">
                              {market.image_url ? (
                                <img src={market.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-indigo-400 text-lg font-bold">P</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-100 leading-snug line-clamp-2 text-[14px] group-hover:text-indigo-300 transition-colors">
                                {market.title}
                              </h4>
                            </div>
                          </div>

                          {/* Outcomes Container - Styled exactly like Polymarket */}
                          <div className="space-y-3 mb-4">
                            {market.outcomes?.slice(0, 2).map((outcome, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <span className="text-[13px] font-semibold text-gray-300 truncate pr-2">
                                  {outcome.label}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[15px] font-black text-white">
                                    {Math.round(outcome.price * 100)}%
                                  </span>
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        window.open(`https://polymarket.com/event/${market.market_slug}?outcome=${outcome.label}`, '_blank');
                                      }}
                                      className="px-3 py-1 bg-[#1e3a2f] text-[#4ade80] text-[12px] font-black rounded-md hover:bg-[#2d5a44] transition-colors min-w-[44px]"
                                    >
                                      Yes
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        const otherOutcome = market.outcomes?.find(o => o.id !== outcome.id);
                                        const outcomeToOpen = otherOutcome ? otherOutcome.label : (outcome.label === 'Yes' ? 'No' : 'Yes');
                                        window.open(`https://polymarket.com/event/${market.market_slug}?outcome=${outcomeToOpen}`, '_blank');
                                      }}
                                      className="px-3 py-1 bg-[#3d1e2a] text-[#f87171] text-[12px] font-black rounded-md hover:bg-[#5a2d3a] transition-colors min-w-[44px]"
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 bg-black/20 border-t border-gray-700/30 flex items-center justify-between mt-auto">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            {formatVolume(market.volume_total)} Vol.
                          </span>
                          
                          <div className="flex items-center gap-3">
                             <button 
                               onClick={() => toggleBookmark(market.market_slug)}
                               className={`p-1.5 rounded-lg transition-all ${isBookmarked ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'}`}
                             >
                               <svg className="w-5 h-5" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                               </svg>
                             </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Recommendation Reason */}
                {currentTab === 'for-you' && recommendations.length > 0 && (
                  <div className="mt-10 p-5 bg-indigo-900/10 rounded-2xl border border-indigo-500/20 backdrop-blur-sm">
                    <p className="text-sm text-indigo-300 italic flex items-center gap-3">
                      <span className="text-xl">✨</span>
                      Prophet has curated these {recommendations[0]?.category} and {recommendations[1]?.category} markets based on your high-volume trading history.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-20 bg-[#1a1a3a]/30 rounded-2xl border border-dashed border-gray-800">
            <div className="text-5xl mb-4 opacity-50">🔌</div>
            <p className="text-lg font-medium">Wallet not connected.</p>
            <p className="text-sm opacity-60">Connect your wallet to see tailored predictions.</p>
          </div>
        )}
      </div>
    </div>
  );
}
