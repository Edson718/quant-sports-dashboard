import { useState } from 'react'
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function RecordResultModal({ prediction, onClose, onSuccess }) {
  const [result, setResult] = useState('won')
  const [actualOdds, setActualOdds] = useState(prediction.odds ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const stake = Number(prediction.stake ?? 0)
  const odds = Number(actualOdds || prediction.odds || 0)

  // decimal odds: profit = stake * (odds - 1) on win, -stake on loss
  const profitLoss = result === 'won'
    ? stake > 0 && odds > 0 ? stake * (odds - 1) : 0
    : stake > 0 ? -stake : 0

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // 1. Insert into ai_evaluation
      const { error: evalErr } = await supabase.from('ai_evaluation').insert({
        prediction_id: prediction.id,
        was_correct: result === 'won',
        profit_loss: profitLoss,
        actual_odds: odds || null,
        notes: notes.trim() || null,
      })
      if (evalErr) throw evalErr

      // 2. Update prediction result
      const { error: predErr } = await supabase
        .from('ai_predictions')
        .update({ result })
        .eq('id', prediction.id)
      if (predErr) throw predErr

      // 3. Get latest bankroll balance and insert updated record
      const { data: bankrollRows, error: bankrollReadErr } = await supabase
        .from('bankroll')
        .select('balance, amount, total, bankroll')
        .order('created_at', { ascending: false })
        .limit(1)
      if (bankrollReadErr) throw bankrollReadErr

      const latestRow = bankrollRows?.[0]
      const currentBalance = Number(
        latestRow?.balance ?? latestRow?.amount ?? latestRow?.total ?? latestRow?.bankroll ?? 0
      )
      const newBalance = currentBalance + profitLoss

      const { error: bankrollWriteErr } = await supabase.from('bankroll').insert({
        balance: newBalance,
        pnl: profitLoss,
        notes: notes.trim() || `Result recorded: ${result} (prediction #${prediction.id})`,
      })
      if (bankrollWriteErr) throw bankrollWriteErr

      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to record result')
    } finally {
      setSubmitting(false)
    }
  }

  const matchLabel = prediction.home_team && prediction.away_team
    ? `${prediction.home_team} vs ${prediction.away_team}`
    : prediction.match_name || prediction.event || prediction.match_id || 'Unknown Match'
  const predLabel = prediction.prediction || prediction.predicted_outcome || '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#13151f] border border-[#2a2d40] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2133]">
          <h3 className="text-base font-semibold text-white">Record Result</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Prediction summary */}
        <div className="px-6 py-4 bg-[#0f1117] border-b border-[#1e2133]">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Prediction</p>
          <p className="text-sm font-medium text-white">{matchLabel}</p>
          <p className="text-xs text-slate-400 mt-0.5">{predLabel}
            {prediction.confidence != null && (
              <span className="ml-2 text-violet-400">{prediction.confidence}% confidence</span>
            )}
          </p>
          <div className="flex gap-4 mt-2">
            {prediction.odds != null && (
              <span className="text-xs text-slate-500">Odds: <span className="text-slate-300">{prediction.odds}</span></span>
            )}
            {stake > 0 && (
              <span className="text-xs text-slate-500">Stake: <span className="text-slate-300">${stake.toFixed(2)}</span></span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Won / Lost */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Outcome</p>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                result === 'won'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-[#0f1117] border-[#1e2133] text-slate-400 hover:border-slate-600'
              }`}>
                <input
                  type="radio"
                  name="result"
                  value="won"
                  checked={result === 'won'}
                  onChange={() => setResult('won')}
                  className="sr-only"
                />
                <CheckCircle size={16} />
                <span className="text-sm font-medium">Won</span>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                result === 'lost'
                  ? 'bg-red-500/10 border-red-500/40 text-red-400'
                  : 'bg-[#0f1117] border-[#1e2133] text-slate-400 hover:border-slate-600'
              }`}>
                <input
                  type="radio"
                  name="result"
                  value="lost"
                  checked={result === 'lost'}
                  onChange={() => setResult('lost')}
                  className="sr-only"
                />
                <XCircle size={16} />
                <span className="text-sm font-medium">Lost</span>
              </label>
            </div>
          </div>

          {/* Actual odds */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Actual Odds (decimal)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              value={actualOdds}
              onChange={e => setActualOdds(e.target.value)}
              placeholder="e.g. 1.85"
              className="w-full bg-[#0f1117] border border-[#2a2d40] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
            />
          </div>

          {/* P&L preview */}
          {stake > 0 && (
            <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
              profitLoss >= 0
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/20'
            }`}>
              <span className="text-xs text-slate-400">Calculated P&L</span>
              <span className={`text-sm font-bold ${profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Notes <span className="text-slate-600 normal-case">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes about this result..."
              rows={2}
              className="w-full bg-[#0f1117] border border-[#2a2d40] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2d40] text-sm text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : 'Record Result'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
