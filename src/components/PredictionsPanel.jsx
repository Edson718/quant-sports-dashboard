import { useState } from 'react'
import { Brain, Clock, CheckCircle, XCircle, AlertCircle, ClipboardCheck, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSupabaseQuery } from '../hooks/useSupabase'
import LoadingSpinner, { ErrorState, EmptyState } from './LoadingSpinner'
import StatCard from './StatCard'
import RecordResultModal from './RecordResultModal'

const normalizeConfidence = (val) => {
  if (val == null) return null
  const n = Number(val)
  return n <= 1 ? n * 100 : n
}

const confidenceColor = (confidence) => {
  if (confidence >= 75) return 'text-emerald-400'
  if (confidence >= 50) return 'text-amber-400'
  return 'text-red-400'
}

const statusIcon = (status) => {
  if (status === 'won') return <CheckCircle size={14} className="text-emerald-400" />
  if (status === 'lost') return <XCircle size={14} className="text-red-400" />
  return <Clock size={14} className="text-slate-400" />
}

const isPending = (pred) => !pred.result || pred.result === 'pending'

const isValidTeam = (team) =>
  team != null && team !== '' && team !== 'Unknown' && team !== 'null' && team !== 'None'

export default function PredictionsPanel() {
  const { data: rawData, loading, error, refetch } = useSupabaseQuery('ai_predictions', {
    order: { column: 'match_date', ascending: true },
    limit: 500,
  })
  const [modalPred, setModalPred] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'future' | 'past'
  const [deletingId, setDeletingId] = useState(null)

  if (loading) return <LoadingSpinner message="Loading predictions..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 1. Filter out null / Unknown home_team
  const cleaned = rawData.filter(p => isValidTeam(p.home_team))

  // 2. Deduplicate by home_team + away_team + match_date
  const seen = new Set()
  const deduped = cleaned.filter(p => {
    const key = `${p.home_team}|${p.away_team}|${p.match_date}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // 3. Apply date filter
  const data = deduped.filter(p => {
    if (filter === 'all') return true
    if (!p.match_date) return filter === 'all'
    const matchDate = new Date(p.match_date)
    matchDate.setHours(0, 0, 0, 0)
    if (filter === 'future') return matchDate >= today
    if (filter === 'past') return matchDate < today
    return true
  })

  const total = data.length
  const pending = data.filter(isPending).length
  const won = data.filter(p => p.result === 'won').length
  const settled = total - pending
  const winRate = settled > 0 ? ((won / settled) * 100).toFixed(1) : 0
  const avgConfidence = total > 0
    ? (data.reduce((sum, p) => sum + (normalizeConfidence(p.ai_confidence) || 0), 0) / total).toFixed(1)
    : 0

  const handleDelete = async (pred) => {
    if (!window.confirm(`Apagar previsão "${pred.home_team} vs ${pred.away_team}"?\nEsta acção não pode ser desfeita.`)) return
    setDeletingId(pred.id)
    try {
      const { error: err } = await supabase.from('ai_predictions').delete().eq('id', pred.id)
      if (err) throw err
      refetch()
    } catch (err) {
      console.error('Delete error:', err)
      alert('Erro ao eliminar: ' + (err.message || err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">AI Predictions</h2>
          <p className="text-sm text-slate-500">Machine learning model outputs and results</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Total Predictions" value={deduped.length} icon={Brain} color="violet" />
          <StatCard
            title="Win Rate"
            value={`${winRate}%`}
            icon={CheckCircle}
            color="green"
            trend={settled > 0 ? (winRate >= 55 ? 'up' : 'down') : undefined}
            trendValue={settled > 0 ? `${won}/${settled} settled` : undefined}
          />
          <StatCard title="Pending" value={pending} icon={Clock} color="amber" />
          <StatCard title="Avg Confidence" value={`${avgConfidence}%`} icon={AlertCircle} color="blue" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {[['all', 'Todos'], ['future', 'Futuros'], ['past', 'Passados']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === val
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        {data.length === 0 ? (
          <EmptyState message="Nenhuma previsão encontrada" />
        ) : (
          <div className="bg-[#13151f] border border-[#1e2133] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e2133] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Previsões</h3>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">{data.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e2133]">
                    {['Jogo', 'Decisão', 'Confiança', 'Mercado', 'Stake', 'Resultado', 'Data', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2133]">
                  {data.map((pred, idx) => {
                    const conf = normalizeConfidence(pred.ai_confidence)
                    const stake = pred.recommended_stake ?? pred.ai_adjusted_stake
                    return (
                      <tr key={pred.id || idx} className="hover:bg-[#1a1d2e] transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-white">
                            {pred.home_team} vs {pred.away_team}
                          </p>
                          {pred.league_name && <p className="text-xs text-slate-500">{pred.league_name}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300">{pred.ai_decision || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {conf != null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${conf >= 75 ? 'bg-emerald-500' : conf >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(conf, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${confidenceColor(conf)}`}>
                                {conf.toFixed(1)}%
                              </span>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">{pred.best_market || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {stake != null ? `$${Number(stake).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {statusIcon(pred.result)}
                            <span className={`text-xs capitalize ${
                              pred.result === 'won' ? 'text-emerald-400' :
                              pred.result === 'lost' ? 'text-red-400' : 'text-slate-400'
                            }`}>{pred.result || 'pending'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {pred.match_date ? new Date(pred.match_date).toLocaleDateString('pt-PT') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {isPending(pred) ? (
                              <button
                                onClick={() => setModalPred(pred)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-400 text-xs font-medium transition-all whitespace-nowrap"
                              >
                                <ClipboardCheck size={12} />
                                Registar
                              </button>
                            ) : (
                              <button
                                onClick={() => setModalPred(pred)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-600 hover:text-slate-400 text-xs transition-all whitespace-nowrap"
                              >
                                <ClipboardCheck size={12} />
                                Re-registar
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(pred)}
                              disabled={deletingId === pred.id}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-red-500/20 border border-transparent hover:border-red-500/30 text-slate-600 hover:text-red-400 text-xs transition-all disabled:opacity-40"
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
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

      {modalPred && (
        <RecordResultModal
          prediction={modalPred}
          onClose={() => setModalPred(null)}
          onSuccess={refetch}
        />
      )}
    </>
  )
}
