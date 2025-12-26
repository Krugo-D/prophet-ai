'use client';

import { WalletProfile as WalletProfileType } from '@/lib/api';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface WalletProfileProps {
  profile: WalletProfileType;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function WalletProfile({ profile }: WalletProfileProps) {
  // Prepare data for charts
  const categoryData = Object.entries(profile.categories)
    .map(([category, data]) => ({
      category,
      volume: data.volume,
      interactions: data.interactions,
      pnl: data.pnl || 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  const pieData = categoryData.map((item) => ({
    name: item.category,
    value: item.volume,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">Total Volume</h3>
          <p className="text-3xl font-bold mt-2 text-gray-900">${profile.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">Total Interactions</h3>
          <p className="text-3xl font-bold mt-2 text-gray-900">{profile.totalInteractions.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">Total PnL</h3>
          <p className={`text-3xl font-bold mt-2 ${profile.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${profile.totalPnL.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Volume by Category Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Volume by Category</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} stroke="#374151" />
            <YAxis stroke="#374151" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
              itemStyle={{ color: '#111827' }}
              formatter={(value: number | string | undefined) => 
                typeof value === 'number' 
                  ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` 
                  : `$${value || '0'}`
              } 
            />
            <Bar dataKey="volume" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Distribution Pie Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Category Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
              itemStyle={{ color: '#111827' }}
              formatter={(value: number | string | undefined) => 
                typeof value === 'number' 
                  ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` 
                  : `$${value || '0'}`
              } 
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Category Details Table */}
      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">Category Details</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PnL</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categoryData.map((item) => (
              <tr key={item.category}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.interactions}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${item.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

