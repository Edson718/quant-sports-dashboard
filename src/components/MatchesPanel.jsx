import { Trophy, Calendar, MapPin, Clock } from 'lucide-react'
import { useSupabaseQuery } from '../hooks/useSupabase'
import LoadingSpinner, { ErrorState, EmptyState } from './LoadingSpinner'
import StatCard from './StatCard'

const outcomeColor = (outcome) => {
  const o = (outcome || '').toLowerCase()
  if (o === 'home' || o === 'win' || o === '1') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (o === 'away' || o === 'loss' || o === '2') return 'bg-red-500/10 text-red-400 border-red-500/20'
  return 'bg-slate-700/50 text-slate-400 border-slate-600/30'
}

export default function MatchesPanel() {
  const { data, loading, error, refetch } = useSupabaseQuery('matches', {
    order: { column: 'match_date', ascending: false },
    limit: 50,
  })

  if (loading) return <LoadingSpinner message="Loading matches..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const total = data.length
  const completed = data.filter(m => m.status === 'completed' || m.status === 'finished' || m.home_score != null).length
  const upcoming = data.filter(m => m.status === 'upcoming' || m.status === 'scheduled').length
  const sports = [...new Set(data.map(m => m.sport).filter(Boolean))].length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Match Results</h2>
        <p className="text-sm text-slate-500">Historical and upcoming match data</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Matches" value={total} icon={Trophy} color="violet" />
        <StatCard title="Completed" value={completed} icon={Trophy} color="green" />
        <StatCard title="Upcoming" value={upcoming} icon={Calendar} color="blue" />
        <StatCard title="Sports" value={sports || '—'} icon={MapPin} color="amber" />
      </div>

      {data.length === 0 ? (
        <EmptyState message="No matches found in matches table" />
      ) : (
        <div className="bg-[#13151f] border border-[#1e2133] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e2133] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Match List</h3>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">{total} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e2133]">
                  {['Match', 'Sport / League', 'Score', 'Outcome', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2133]">
                {data.map((match, idx) => {
                  const homeTeam = match.home_team || match.team_home || 'Home'
                  const awayTeam = match.away_team || match.team_away || 'Away'
                  const hasScore = match.home_score != null && match.away_score != null
                  const outcome = match.outcome || match.result || match.winner
                  const isLive = match.status === 'live' || match.status === 'in_progress'

                  return (
                    <tr key={match.id || idx} className="hover:bg-[#1a1d2e] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm font-medium text-white">{homeTeam}</p>
                          <p className="text-xs text-slate-500">vs</p>
                          <p className="text-sm font-medium text-white">{awayTeam}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-300 capitalize">{match.sport || '—'}</p>
                        {match.league && <p className="text-xs text-slate-500">{match.league}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {hasScore ? (
                          <span className="text-lg font-bold text-white tabular-nums">
                            {match.home_score} - {match.away_score}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {outcome ? (
                          <span className={`text-xs px-2 py-1 rounded-full border capitalize ${outcomeColor(outcome)}`}>
                            {outcome}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {isLive && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                          <span className={`text-xs capitalize ${isLive ? 'text-red-400' : 'text-slate-400'}`}>
                            {match.status || 'unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {match.match_date ? new Date(match.match_date).toLocaleDateString() : '—'}
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
