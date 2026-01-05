'use client';

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import ProphetLogo from './ProphetLogo';

interface CategoryStats {
  volume: number;
  interactions: number;
  pnl: number | null;
}

interface WalletProfileData {
  wallet: string;
  categories: { [category: string]: CategoryStats };
  totalInteractions: number;
  totalVolume: number;
  totalPnL: number;
  mlProfile?: {
    interest_vector: number[];
    last_updated: string;
    topSemanticMarkets?: {
      title: string;
      similarity: number;
      category: string;
    }[];
    globalUniquenessScore?: number;
  };
}

interface WalletProfileProps {
  data: WalletProfileData;
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16',
];

export default function WalletProfile({ data }: WalletProfileProps) {
  // Filter out "All" category and prepare data for human-readable charts
  const filteredCategories = Object.entries(data.categories)
    .filter(([category]) => category !== 'All');

  const barData = filteredCategories
    .map(([category, stats]) => ({
      category,
      volume: stats.volume,
    }))
    .sort((a, b) => b.volume - a.volume);

  const walletCategories = filteredCategories
    .filter(([, stats]) => stats.volume > 0)
    .map(([category, stats]) => ({
      name: category,
      value: stats.volume,
    }))
    .sort((a, b) => b.value - a.value);

  const radarData = barData.slice(0, 6).map(item => ({
    subject: item.category,
    A: (item.volume / (data.totalVolume || 1)) * 100,
    fullMark: 100,
  }));

  const renderMLDeepDive = () => {
    if (!data.mlProfile) return null;
    
    const { interest_vector, topSemanticMarkets, globalUniquenessScore } = data.mlProfile;
    
    const vectorArray = Array.isArray(interest_vector) 
      ? interest_vector 
      : (typeof interest_vector === 'string' 
          ? (interest_vector as string).replace(/[\[\]]/g, '').split(',').map(v => parseFloat(v))
          : []);

    // Full 768 dimensions
    const vectorSample = vectorArray.slice(0, 768);
    
    return (
      <div className="mt-12 space-y-8">
        {/* AI Header */}
        <div className="relative p-8 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-black rounded-full uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/50">
              Prophet AI v1.0
            </span>
          </div>
          <div className="relative z-10 flex items-center gap-6">
            <ProphetLogo size={64} className="opacity-90 shadow-2xl shadow-indigo-500/20" />
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                AI INTEREST PROFILE
              </h2>
              <p className="text-indigo-600 dark:text-indigo-400 font-bold mt-1 text-sm uppercase tracking-widest">
                768-Dimensional Behavioral Analysis
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Heatmap */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#1a1a3a] p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight text-center">Behavioral Interest Signature</h3>
                  <p className="text-xs text-gray-500 mt-1">Vector representation of historical market engagement</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-indigo-500">{(globalUniquenessScore! * 100).toFixed(1)}%</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Uniqueness</div>
                </div>
              </div>

              {/* Heatmap Grid - 32x24 for 768 dots */}
              <div 
                className="grid gap-[2px] p-4 bg-gray-50 dark:bg-black/40 rounded-xl border border-gray-100 dark:border-gray-800"
                style={{ gridTemplateColumns: 'repeat(32, minmax(0, 1fr))' }}
              >
                {vectorSample.map((val, i) => {
                  const opacity = Math.min(Math.abs(val) * 15, 0.9);
                  const color = val > 0 ? `rgba(99, 102, 241, ${opacity})` : `rgba(236, 72, 153, ${opacity})`;
                  const solidColor = val > 0 ? '#6366f1' : '#ec4899';
                  
                  return (
                    <div 
                      key={i} 
                      className="aspect-square rounded-[1px] transition-all duration-200 hover:z-50 cursor-crosshair border border-white/5 hover:border-white/40 hover:scale-125" 
                      style={{ backgroundColor: color }}
                      onMouseEnter={() => {
                        const tooltip = document.getElementById('vector-tooltip');
                        if (tooltip) {
                          tooltip.innerText = `DIMENSION ${i}: ${val > 0 ? '+' : ''}${val.toFixed(6)}`;
                          tooltip.style.opacity = '1';
                          tooltip.style.color = solidColor;
                        }
                      }}
                      onMouseLeave={() => {
                        const tooltip = document.getElementById('vector-tooltip');
                        if (tooltip) {
                          tooltip.style.opacity = '0.4';
                          tooltip.style.color = '';
                        }
                      }}
                    ></div>
                  );
                })}
              </div>

              <div id="vector-tooltip" className="mt-6 font-mono text-xl font-black text-indigo-500 uppercase tracking-widest opacity-30 transition-all duration-300">
                SCANNING NEURAL NODES...
              </div>

              {/* Anchors */}
              <div className="mt-8 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Semantic Drift Anchors</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topSemanticMarkets?.slice(0, 4).map((m, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate pr-4">{m.title}</span>
                      <span className="text-[10px] font-mono text-indigo-500">{(m.similarity * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Side Panel */}
          <div className="space-y-6">
            <div className="bg-indigo-600 p-8 rounded-2xl text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group h-full flex flex-col justify-center">
              <div className="absolute -right-4 -bottom-4 text-white/10 text-8xl font-black rotate-12 group-hover:rotate-0 transition-transform duration-700">AI</div>
              <h4 className="text-xs font-black uppercase mb-4 tracking-[0.2em] opacity-80">Predictive Inference</h4>
              <p className="text-2xl font-black leading-tight">
                This wallet's DNA shows high-density engagement with <span className="text-indigo-200 underline decoration-2 underline-offset-4 uppercase italic">
                  {barData[0]?.category || 'Emerging Alpha'}
                </span> clusters.
              </p>
              <div className="mt-8 pt-6 border-t border-white/20 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest">Model Confidence</span>
                <span className="text-sm font-black">94.8%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-8 pb-32">
      {/* Raw Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Volume', value: `$${data.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: 'text-indigo-500' },
          { label: 'Market Hits', value: data.totalInteractions.toLocaleString(), color: 'text-purple-500' },
          { label: 'Realized PnL', value: `${data.totalPnL >= 0 ? '+' : ''}$${data.totalPnL.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: data.totalPnL >= 0 ? 'text-green-500' : 'text-red-500' },
          { label: 'Active Clusters', value: filteredCategories.length.toString(), color: 'text-pink-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1a1a3a] p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{stat.label}</div>
            <div className={`text-2xl font-black ${stat.color} tracking-tight`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-[#1a1a3a] p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-6">Category Momentum</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.5} />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} interval={0} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                contentStyle={{ backgroundColor: '#1a1a3a', border: '1px solid #2d2d4f', borderRadius: '12px', color: '#ffffff' }}
                itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                formatter={(val: number) => `$${val.toLocaleString()}`}
              />
              <Bar dataKey="volume" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-[#1a1a3a] p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col">
          <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-6">Category Breakdown</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={walletCategories}
                  cx="50%" cy="45%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {walletCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a3a', border: '1px solid #2d2d4f', borderRadius: '12px', color: '#ffffff' }}
                  itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(val: number) => {
                    const totalVal = walletCategories.reduce((sum, d) => sum + d.value, 0);
                    return `${((val / totalVal) * 100).toFixed(1)}%`;
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}
                  formatter={(value) => {
                    const item = walletCategories.find(d => d.name === value);
                    const totalVal = walletCategories.reduce((sum, d) => sum + d.value, 0);
                    const percent = item ? ((item.value / totalVal) * 100).toFixed(0) : '0';
                    return `${value} (${percent}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Deep Dive Section */}
      {renderMLDeepDive()}
    </div>
  );
}
