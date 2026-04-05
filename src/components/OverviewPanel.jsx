import { Brain, Trophy, DollarSign, TrendingUp, Activity } from 'lucide-react'
import { useSupabaseQuery } from '../hooks/useSupabase'
import StatCard from './StatCard'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

function MiniWidget({ title, children }) {
  return (
    <div className="bg-[#13151f] border border-[#1e2133] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      {children}
    </div>
  )
}

function RecentItem({ left, right, sub, badge, badgeColor }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1e2133] last:border-0">
      <div>
        <p className="text-sm text-white">{left}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${badgeColor}`}>{badge}</span>
        )}
        <span className="text-sm text-slate-300">{right}</span>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
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

export default function OverviewPanel() {
  const { data: predictions } = useSupabaseQuery('ai_predictions', { order: { column: 'created_at', ascending: false }, limit: 5 })
  const { data: allPredictions } = useSupabaseQuery('ai_predictions', { limit: 500 })
  const { data: matches } = useSupabaseQuery('matches', { order: { column: 'match_date', ascending: false }, limit: 5 })
  const { data: bankroll } = useSupabaseQuery('bankroll', { order: { column: 'created_at', ascending: true }, limit: 100 })
  const { data: evaluation } = useSupabaseQuery('ai_evaluation', { order: { column: 'created_at', ascending: false }, limit: 1 })

  const currentBalance = (() => {
    const last = bankroll.at(-1)
    const val = last?.balance ?? last?.amount ?? last?.bankroll ?? last?.total
    return val != null ? Number(val) : null
  })()

  const totalPredictions = allPredictions.length
  const wonPredictions = allPredictions.filter(p => p.result === 'won').length
  const settledPredictions = allPredictions.filter(p => p.result === 'won' || p.result === 'lost').length
  const winRate = settledPredictions > 0 ? ((wonPredictions / settledPredictions) * 100).toFixed(1) : null

  const latestEval = evaluation[0]
  const latestAccuracy = latestEval?.accuracy ?? latestEval?.accuracy_rate

  const chartData = bankroll.map((row, i) => ({
    date: row.created_at
      ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : `#${i + 1}`,
    balance: Number(row.balance ?? row.amount ?? row.bankroll ?? row.total ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Overview</h2>
        <p className="text-sm text-slate-500">Dashboard summary across all data sources</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Current Bankroll"
          value={currentBalance != null ? `$${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
          icon={DollarSign}
          color="violet"
        />
        <StatCard
          title="Total Predictions"
          value={totalPredictions || '—'}
          icon={Brain}
          color="blue"
        />
        <StatCard
          title="Win Rate"
          value={winRate != null ? `${winRate}%` : '—'}
          icon={TrendingUp}
          color={winRate >= 55 ? 'green' : winRate != null ? 'amber' : 'violet'}
          trend={winRate >= 55 ? 'up' : winRate != null ? 'down' : undefined}
          trendValue={winRate != null ? `${wonPredictions}/${settledPredictions} bets` : undefined}
        />
        <StatCard
          title="Model Accuracy"
          value={latestAccuracy != null ? `${Number(latestAccuracy).toFixed(1)}%` : '—'}
          icon={Activity}
          color={latestAccuracy >= 60 ? 'green' : 'amber'}
        />
      </div>

      {/* Bankroll chart */}
      {chartData.length > 1 && (
        <div className="bg-[#13151f] border border-[#1e2133] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Bankroll Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2133" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString()}`} width={65} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="balance" stroke="#7c3aed" strokeWidth={2} fill="url(#overviewGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent activity panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <MiniWidget title="Recent Predictions">
          {predictions.length === 0
            ? <p className="text-sm text-slate-500 text-center py-4">No predictions yet</p>
            : predictions.map((p, i) => (
              <RecentItem
                key={p.id || i}
                left={p.home_team && p.away_team
                ? `${p.home_team} vs ${p.away_team}`
                : p.match_name || p.event || p.match_id || '—'}
                sub={p.prediction || p.predicted_outcome}
                right={p.confidence != null ? `${p.confidence}%` : '—'}
                badge={p.result || 'pending'}
                badgeColor={
                  p.result === 'won' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  p.result === 'lost' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  'bg-slate-700/50 text-slate-400 border-slate-600/30'
                }
              />
            ))
          }
        </MiniWidget>

        <MiniWidget title="Recent Matches">
          {matches.length === 0
            ? <p className="text-sm text-slate-500 text-center py-4">No matches yet</p>
            : matches.map((m, i) => {
              const homeTeam = m.home_team || m.team_home || 'Home'
              const awayTeam = m.away_team || m.team_away || 'Away'
              const hasScore = m.home_score != null && m.away_score != null
              return (
                <RecentItem
                  key={m.id || i}
                  left={`${homeTeam} vs ${awayTeam}`}
                  sub={m.sport ? m.sport.charAt(0).toUpperCase() + m.sport.slice(1) : undefined}
                  right={hasScore ? `${m.home_score} - ${m.away_score}` : '—'}
                  badge={m.status}
                  badgeColor={
                    m.status === 'completed' || m.status === 'finished'
                      ? 'bg-slate-700/50 text-slate-400 border-slate-600/30'
                      : m.status === 'live'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }
                />
              )
            })
          }
        </MiniWidget>
      </div>
    </div>
  )
}
