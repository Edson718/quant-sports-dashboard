import { useState } from 'react'
import { Brain, Clock, CheckCircle, XCircle, AlertCircle, ClipboardCheck } from 'lucide-react'
import { useSupabaseQuery } from '../hooks/useSupabase'
import LoadingSpinner, { ErrorState, EmptyState } from './LoadingSpinner'
import StatCard from './StatCard'
import RecordResultModal from './RecordResultModal'

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

export default function PredictionsPanel() {
  const { data, loading, error, refetch } = useSupabaseQuery('ai_predictions', {
    order: { column: 'created_at', ascending: false },
    limit: 50,
  })
  const [modalPred, setModalPred] = useState(null)

  if (loading) return <LoadingSpinner message="Loading predictions..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const total = data.length
  const pending = data.filter(isPending).length
  const won = data.filter(p => p.result === 'won').length
  const settled = total - pending
  const winRate = settled > 0 ? ((won / settled) * 100).toFixed(1) : 0
  const avgConfidence = total > 0
    ? (data.reduce((sum, p) => sum + (p.confidence || 0), 0) / total).toFixed(1)
    : 0

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">AI Predictions</h2>
          <p className="text-sm text-slate-500">Machine learning model outputs and results</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Total Predictions" value={total} icon={Brain} color="violet" />
          <StatCard title="Win Rate" value={`${winRate}%`} icon={CheckCircle} color="green"
            trend={settled > 0 ? (winRate >= 55 ? 'up' : 'down') : undefined}
            trendValue={settled > 0 ? `${won}/${settled} settled` : undefined} />
          <StatCard title="Pending" value={pending} icon={Clock} color="amber" />
          <StatCard title="Avg Confidence" value={`${avgConfidence}%`} icon={AlertCircle} color="blue" />
        </div>

        {/* Table */}
        {data.length === 0 ? (
          <EmptyState message="No predictions found in ai_predictions table" />
        ) : (
          <div className="bg-[#13151f] border border-[#1e2133] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e2133] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Recent Predictions</h3>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">{total} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e2133]">
                    {['Match / Event', 'Prediction', 'Confidence', 'Odds', 'Stake', 'Result', 'Date', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2133]">
                  {data.map((pred, idx) => (
                    <tr key={pred.id || idx} className="hover:bg-[#1a1d2e] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white">
                          {pred.home_team && pred.away_team
                            ? `${pred.home_team} vs ${pred.away_team}`
                            : pred.match_name || pred.event || pred.match_id || '—'}
                        </p>
                        {pred.sport && <p className="text-xs text-slate-500 capitalize">{pred.sport}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">{pred.prediction || pred.predicted_outcome || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {pred.confidence != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pred.confidence >= 75 ? 'bg-emerald-500' : pred.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${pred.confidence}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${confidenceColor(pred.confidence)}`}>
                              {pred.confidence}%
                            </span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{pred.odds != null ? pred.odds : '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {pred.stake != null ? `$${Number(pred.stake).toFixed(2)}` : '—'}
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
                        {pred.created_at ? new Date(pred.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {isPending(pred) ? (
                          <button
                            onClick={() => setModalPred(pred)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-400 text-xs font-medium transition-all whitespace-nowrap"
                          >
                            <ClipboardCheck size={12} />
                            Record Result
                          </button>
                        ) : (
                          <button
                            onClick={() => setModalPred(pred)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-600 hover:text-slate-400 text-xs transition-all whitespace-nowrap"
                          >
                            <ClipboardCheck size={12} />
                            Re-record
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
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
