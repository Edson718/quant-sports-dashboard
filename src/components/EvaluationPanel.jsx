import { TrendingUp, TrendingDown, Target, Percent, DollarSign, Hash, BarChart2 } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { useSupabaseQuery } from '../hooks/useSupabase'
import LoadingSpinner, { ErrorState, EmptyState } from './LoadingSpinner'
import StatCard from './StatCard'

const normalizeConfidence = (val) => {
  if (val == null) return null
  const n = Number(val)
  return n <= 1 ? n * 100 : n
}

const isValidTeam = (team) =>
  team != null && team !== '' && team !== 'Unknown' && team !== 'null' && team !== 'None'

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
    limit: 500,
  })

  const { data: bankrollData, loading: bankrollLoading } = useSupabaseQuery('bankroll', {
    order: { column: 'created_at', ascending: true },
    limit: 200,
  })

  const { data: predData } = useSupabaseQuery('ai_predictions', {
    order: { column: 'match_date', ascending: true },
    limit: 1000,
  })

  if (evalLoading || bankrollLoading) return <LoadingSpinner message="Loading performance data..." />
  if (evalError) return <ErrorState message={evalError} onRetry={evalRefetch} />

  // ── Filter valid predictions ───────────────────────────────────────────────
  const validPreds = predData.filter(p => isValidTeam(p.home_team))

  // Build lookup map: prediction id → prediction record
  const predById = {}
  validPreds.forEach(p => { if (p.id != null) predById[p.id] = p })

  // ── Win rate & confidence from ai_predictions ──────────────────────────────
  const settledPreds = validPreds.filter(p => p.result === 'won' || p.result === 'lost')
  const wonPreds = settledPreds.filter(p => p.result === 'won').length
  const winRateFromPreds = settledPreds.length > 0
    ? ((wonPreds / settledPreds.length) * 100).toFixed(1)
    : null

  const confValues = validPreds.map(p => normalizeConfidence(p.ai_confidence)).filter(v => v != null)
  const avgConfidence = confValues.length > 0
    ? (confValues.reduce((a, b) => a + b, 0) / confValues.length).toFixed(1)
    : null

  // ── Core stats from ai_evaluation ──────────────────────────────────────────
  const recordedEvals = evalData.filter(r => r.was_correct != null)
  const totalBets = recordedEvals.length
  const wins = recordedEvals.filter(r => r.was_correct === true).length
  const losses = recordedEvals.filter(r => r.was_correct === false).length
  const winRateFromEval = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : null

  // Use eval win rate if available, otherwise predictions win rate
  const winRate = winRateFromEval ?? winRateFromPreds
  const winRateWins = winRateFromEval != null ? wins : wonPreds
  const winRateTotal = winRateFromEval != null ? totalBets : settledPreds.length
  const winRateLosses = winRateFromEval != null ? losses : (settledPreds.length - wonPreds)

  const pnlValues = recordedEvals.map(r => Number(r.profit_loss ?? 0))
  const totalPnL = pnlValues.reduce((a, b) => a + b, 0)

  // ROI using recommended_stake or ai_adjusted_stake
  const totalStaked = recordedEvals.reduce((sum, r) => {
    const pred = predById[r.prediction_id]
    const stake = pred?.recommended_stake ?? pred?.ai_adjusted_stake ?? pred?.stake
    return sum + (stake != null ? Number(stake) : 0)
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
  const pnlBars = recordedEvals.slice(-30).map((row, i) => {
    const pred = predById[row.prediction_id]
    const matchLabel = pred ? `${pred.home_team} x ${pred.away_team}` : (row.prediction_id ? `#${row.prediction_id}` : `#${i + 1}`)
    return {
      label: matchLabel.length > 20 ? matchLabel.slice(0, 18) + '…' : matchLabel,
      pnl: Number(row.profit_loss ?? 0),
      date: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    }
  })

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
        <h2 className="text-xl font-semibold text-white mb-1">Desempenho</h2>
        <p className="text-sm text-slate-500">Taxa de vitórias, P&L, ROI e histórico de bankroll</p>
      </div>

      {/* ── Top stats ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Taxa de Vitórias"
          value={winRate != null ? `${winRate}%` : '—'}
          subtitle={winRateTotal > 0 ? `${winRateWins}V / ${winRateLosses}D` : 'Sem resultados'}
          icon={Percent}
          color={winRate >= 55 ? 'green' : winRate != null ? 'amber' : 'violet'}
          trend={winRate != null ? (winRate >= 55 ? 'up' : 'down') : undefined}
          trendValue={winRate != null ? `${winRate >= 55 ? 'Acima' : 'Abaixo'} de 55%` : undefined}
        />
        <StatCard
          title="Confiança Média"
          value={avgConfidence != null ? `${avgConfidence}%` : '—'}
          subtitle={confValues.length > 0 ? `${confValues.length} previsões` : undefined}
          icon={BarChart2}
          color={avgConfidence >= 65 ? 'green' : avgConfidence != null ? 'amber' : 'violet'}
        />
        <StatCard
          title="Total P&L"
          value={totalBets > 0
            ? `${isProfit ? '+' : ''}$${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '—'}
          subtitle={totalStaked > 0 ? `em $${totalStaked.toFixed(2)} apostado` : undefined}
          icon={isProfit ? TrendingUp : TrendingDown}
          color={isProfit ? 'green' : totalBets > 0 ? 'red' : 'violet'}
          trend={totalBets > 0 ? (isProfit ? 'up' : 'down') : undefined}
        />
        <StatCard
          title="ROI"
          value={roi != null ? `${Number(roi) >= 0 ? '+' : ''}${roi}%` : '—'}
          subtitle={totalStaked > 0 ? `$${totalStaked.toFixed(2)} total apostado` : 'Sem dados de stake'}
          icon={Target}
          color={roi >= 0 ? 'green' : roi != null ? 'red' : 'violet'}
          trend={roi != null ? (roi >= 0 ? 'up' : 'down') : undefined}
        />
      </div>

      {/* ── Bankroll over time ── */}
      {bankrollChart.length > 1 && (
        <div className="bg-[#13151f] border border-[#1e2133] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Bankroll ao Longo do Tempo</h3>
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
          <div className="bg-[#13151f] border border-[#1e2133] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">P&L Acumulado</h3>
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

          <div className="bg-[#13151f] border border-[#1e2133] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">P&L Por Aposta</h3>
            <p className="text-xs text-slate-500 mb-4">Últimos {pnlBars.length} resultados</p>
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
        <EmptyState message="Sem avaliações — regista resultados na página Previsões" />
      ) : (
        <div className="bg-[#13151f] border border-[#1e2133] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e2133] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Registo de Avaliações</h3>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">{evalData.length} registos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e2133]">
                  {['Data', 'Jogo', 'Resultado', 'Odds Reais', 'P&L', 'Notas'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2133]">
                {[...evalData].reverse().map((row, idx) => {
                  const pnl = row.profit_loss != null ? Number(row.profit_loss) : null
                  const pred = predById[row.prediction_id]
                  const matchName = pred
                    ? `${pred.home_team} x ${pred.away_team}`
                    : row.prediction_id != null
                    ? `#${row.prediction_id}`
                    : '—'
                  return (
                    <tr key={row.id || idx} className="hover:bg-[#1a1d2e] transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {row.created_at ? new Date(row.created_at).toLocaleString('pt-PT') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white">{matchName}</p>
                        {pred?.league_name && <p className="text-xs text-slate-500">{pred.league_name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {row.was_correct != null ? (
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            row.was_correct
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {row.was_correct ? 'Ganhou' : 'Perdeu'}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full border bg-slate-700/50 text-slate-400 border-slate-600/30">
                            Pendente
                          </span>
                        )}
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
