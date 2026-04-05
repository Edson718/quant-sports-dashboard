import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useSupabaseQuery } from '../hooks/useSupabase'
import LoadingSpinner, { ErrorState, EmptyState } from './LoadingSpinner'
import StatCard from './StatCard'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e2133] border border-[#2a2d40] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-violet-400">
        ${Number(payload[0].value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

export default function BankrollPanel() {
  const { data, loading, error, refetch } = useSupabaseQuery('bankroll', {
    order: { column: 'created_at', ascending: true },
    limit: 100,
  })

  if (loading) return <LoadingSpinner message="Loading bankroll data..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const balances = data
    .map(r => r.balance ?? r.amount ?? r.bankroll ?? r.total ?? null)
    .filter(v => v != null)
    .map(Number)

  const current = balances.at(-1) ?? 0
  const initial = balances[0] ?? 0
  const peak = balances.length ? Math.max(...balances) : 0
  const drawdown = peak > 0 ? (((peak - current) / peak) * 100).toFixed(1) : 0
  const totalPnL = current - initial
  const totalPnLPct = initial > 0 ? ((totalPnL / initial) * 100).toFixed(1) : 0
  const isProfit = totalPnL >= 0

  const chartData = data.map((row, i) => ({
    date: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `#${i + 1}`,
    balance: Number(row.balance ?? row.amount ?? row.bankroll ?? row.total ?? 0),
    pnl: Number(row.pnl ?? row.profit_loss ?? row.profit ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Bankroll Tracker</h2>
        <p className="text-sm text-slate-500">Account balance and P&L over time</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Current Balance"
          value={`$${current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="violet"
        />
        <StatCard
          title="Total P&L"
          value={`${isProfit ? '+' : ''}$${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${totalPnLPct}% from initial`}
          icon={isProfit ? TrendingUp : TrendingDown}
          color={isProfit ? 'green' : 'red'}
          trend={isProfit ? 'up' : 'down'}
          trendValue={`${totalPnLPct}%`}
        />
        <StatCard
          title="Peak Balance"
          value={`$${peak.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Max Drawdown"
          value={`${drawdown}%`}
          icon={Activity}
          color={drawdown > 20 ? 'red' : drawdown > 10 ? 'amber' : 'green'}
          trend={drawdown > 10 ? 'down' : 'up'}
          trendValue="from peak"
        />
      </div>

      {/* Chart */}
      {chartData.length > 1 ? (
        <div className="bg-[#13151f] border border-[#1e2133] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Balance History</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2133" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#1e2133' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${v.toLocaleString()}`}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#balanceGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Table */}
      {data.length === 0 ? (
        <EmptyState message="No bankroll data found" />
      ) : (
        <div className="bg-[#13151f] border border-[#1e2133] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e2133]">
            <h3 className="text-sm font-semibold text-white">Transaction History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e2133]">
                  {['Date', 'Balance', 'P&L', 'Notes / Type'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2133]">
                {[...data].reverse().map((row, idx) => {
                  const balance = row.balance ?? row.amount ?? row.bankroll ?? row.total
                  const pnl = row.pnl ?? row.profit_loss ?? row.profit
                  const isPosOrNeg = pnl != null ? Number(pnl) >= 0 : null
                  return (
                    <tr key={row.id || idx} className="hover:bg-[#1a1d2e] transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">
                        {balance != null ? `$${Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {pnl != null ? (
                          <span className={`text-sm font-medium ${isPosOrNeg ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPosOrNeg ? '+' : ''}${Number(pnl).toFixed(2)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 capitalize">
                        {row.notes || row.type || row.description || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
