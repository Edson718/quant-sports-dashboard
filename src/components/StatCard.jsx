import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ title, value, subtitle, trend, trendValue, icon: Icon, color = 'violet' }) {
  const colorMap = {
    violet: 'from-violet-500/20 to-violet-600/5 border-violet-500/20 text-violet-400',
    green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20 text-red-400',
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-5`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg bg-black/20`}>
            <Icon size={18} className={colorMap[color].split(' ').pop()} />
          </div>
        )}
      </div>
      {trendValue !== undefined && (
        <div className={`flex items-center gap-1 mt-3 ${trendColor}`}>
          <TrendIcon size={13} />
          <span className="text-xs font-medium">{trendValue}</span>
        </div>
      )}
    </div>
  )
}
