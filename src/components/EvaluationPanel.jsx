import { TrendingUp, TrendingDown, Target, Percent, DollarSign, Hash } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { useSupabaseQuery } from '../hooks/useSupabase'
import LoadingSpinner, { ErrorState, EmptyState } from './LoadingSpinner'
import StatCard from './StatCard'

const TooltipDollar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e2133] border border-[#2a2d40] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-violet-400">
        ${Number(payload[0].value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}

const TooltipPnL = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = Number(payload[0].value)
  return (
    <div className="bg-[#1e2133] border border-[#2a2d40] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-semibold ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {val >= 0 ? '+' : ''}${val.toFixed(2)}
      </p>
    </div>
  )
}

export default function EvaluationPanel() {
  const { data: evalData, loading: evalLoading, error: evalError, refetch: evalRefetch } = useSupabaseQuery('ai_evaluation', {
    order: { column: 'created_at', ascending: true },
    limit: 200,
  })

  const { data: bankrollData, loading: bankrollLoading } = useSupabaseQuery('bankroll', {
    order: { column: 'created_at', ascending: true },
    limit: 200,
  })

  const { data: predData } = useSupabaseQuery('ai_predictions', { limit: 500 })

  if (evalLoading || bankrollLoading) return <LoadingSpinner message="Loading performance data..." />
  if (evalError) return <ErrorState message={evalError} onRetry={evalRefetch} />

  // ── Core stats from ai_evaluation ──────────────────────────────────────────
  const recordedEvals = evalData.filter(r => r.was_correct != null)
  const totalBets = recordedEvals.length
  const wins = recordedEvals.filter(r => r.was_correct === true).length
  const losses = recordedEvals.filter(r => r.was_correct === false).length
  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : null

  const pnlValues = recordedEvals.map(r => Number(r.profit_loss ?? 0))
  const totalPnL = pnlValues.reduce((a, b) => a + b, 0)

  // ROI = totalPnL / totalStaked * 100, derive totalStaked from linked predictions
  const stakeByPredId = {}
  predData.forEach(p => {
    if (p.id != null && p.stake != null) stakeByPredId[p.id] = Number(p.stake)
  })
  const totalStaked = recordedEvals.reduce((sum, r) => {
    return sum + (r.prediction_id != null ? (stakeByPredId[r.prediction_id] ?? 0) : 0)
  }, 0)
  const roi = totalStaked > 0 ? ((totalPnL / totalStaked) * 100).toFixed(2) : null

  // ── Bankroll chart ──────────────────────────────────────────────────────────
  const bankrollChart = bankrollData.map((row, i) => ({
    date: row.created_at
      ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : `#${i + 1}`,
    balance: Number(row.balance ?? row.amount ?? row.bankroll ?? row.total ?? 0),
  }))

  // ── Per-bet P&L bars ────────────────────────────────────────────────────────
  const pnlBars = recordedEvals.slice(-30).map((row, i) => ({
    label: row.prediction_id ? `#${row.prediction_id}` : `#${i + 1}`,
    pnl: Number(row.profit_loss ?? 0),
    date: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
  }))

  // ── Cumulative P&L line ─────────────────────────────────────────────────────
  let running = 0
  const cumulativePnL = recordedEvals.map((row, i) => {
    running += Number(row.profit_loss ?? 0)
    return {
      date: row.created_at
        ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : `#${i + 1}`,
      cumPnL: running,
    }
  })

  const isProfit = totalPnL >= 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Performance</h2>
        <p className="text-sm text-slate-500">Win rate, P&L, ROI and bankroll history from recorded results</p>
      </div>

      {/* ── Top stats ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Win Rate"
          value={winRate != null ? `${winRate}%` : '—'}
          subtitle={totalBets > 0 ? `${wins}W / ${losses}L` : 'No results yet'}
          icon={Percent}
          color={winRate >= 55 ? 'green' : winRate != null ? 'amber' : 'violet'}
          trend={winRate != null ? (winRate >= 55 ? 'up' : 'down') : undefined}
          trendValue={winRate != null ? `${winRate >= 55 ? 'Above' : 'Below'} 55% threshold` : undefined}
        />
        <StatCard
          title="Total Bets"
          value={totalBets || '—'}
          subtitle={totalBets > 0 ? `${wins} won · ${losses} lost` : undefined}
          icon={Hash}
          color="blue"
        />
        <StatCard
          title="Total P&L"
          value={totalBets > 0
            ? `${isProfit ? '+' : ''}$${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '—'}
          subtitle={totalStaked > 0 ? `on $${totalStaked.toFixed(2)} staked` : undefined}
          icon={isProfit ? TrendingUp : TrendingDown}
          color={isProfit ? 'green' : totalBets > 0 ? 'red' : 'violet'}
          trend={totalBets > 0 ? (isProfit ? 'up' : 'down') : undefined}
        />
        <StatCard
          title="ROI"
          value={roi != null ? `${Number(roi) >= 0 ? '+' : ''}${roi}%` : '—'}
          subtitle={totalStaked > 0 ? `$${totalStaked.toFixed(2)} total staked` : 'No stake data'}
          icon={Target}
          color={roi >= 0 ? 'green' : roi != null ? 'red' : 'violet'}
          trend={roi != null ? (roi >= 0 ? 'up' : 'down') : undefined}
        />
      </div>

      {/* ── Bankroll over time ── */}
      {bankrollChart.length > 1 && (
        <div className="bg-[#13151f] border border-[#1e2133] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Bankroll Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={bankrollChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="bankGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2133" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${v.toLocaleString()}`}
                width={70}
              />
              <Tooltip content={<TooltipDollar />} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#bankGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Cumulative P&L + per-bet bars ── */}
      {cumulativePnL.length > 1 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Cumulative P&L */}
          <div className="bg-[#13151f] border border-[#1e2133] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Cumulative P&L</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cumulativePnL} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isProfit ? '#10b981' : '#ef4444'} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={isProfit ? '#10b981' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2133" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `$${v.toFixed(0)}`}
                  width={55}
                />
                <Tooltip content={<TooltipPnL />} />
                <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="cumPnL"
                  stroke={isProfit ? '#10b981' : '#ef4444'}
                  strokeWidth={2}
                  fill="url(#pnlGrad)"
                  dot={false}
                  activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Per-bet P&L bars */}
          <div className="bg-[#13151f] border border-[#1e2133] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">P&L Per Bet</h3>
            <p className="text-xs text-slate-500 mb-4">Last {pnlBars.length} recorded results</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pnlBars} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2133" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `$${v}`}
                  width={50}
                />
                <Tooltip content={<TooltipPnL />} />
                <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                  {pnlBars.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Evaluation log ── */}
      {evalData.length === 0 ? (
        <EmptyState message="No evaluation data yet — record results from the Predictions page" />
      ) : (
        <div className="bg-[#13151f] border border-[#1e2133] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e2133] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Evaluation Log</h3>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">{evalData.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e2133]">
                  {['Date', 'Prediction ID', 'Result', 'Actual Odds', 'P&L', 'Notes'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2133]">
                {[...evalData].reverse().map((row, idx) => {
                  const pnl = row.profit_loss != null ? Number(row.profit_loss) : null
                  return (
                    <tr key={row.id || idx} className="hover:bg-[#1a1d2e] transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {row.prediction_id != null ? `#${row.prediction_id}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.was_correct != null ? (
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            row.was_correct
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {row.was_correct ? 'Won' : 'Lost'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {row.actual_odds != null ? row.actual_odds : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {pnl != null ? (
                          <span className={`text-sm font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">
                        {row.notes || '—'}
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
