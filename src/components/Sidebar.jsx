import { BarChart2, Brain, Trophy, DollarSign, TrendingUp, Settings, RefreshCw } from 'lucide-react'

const navItems = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'predictions', label: 'AI Predictions', icon: Brain },
  { id: 'matches', label: 'Match Results', icon: Trophy },
  { id: 'bankroll', label: 'Bankroll', icon: DollarSign },
  { id: 'evaluation', label: 'Performance', icon: TrendingUp },
]

export default function Sidebar({ activeTab, onTabChange, onRefresh, lastUpdated }) {
  return (
    <aside className="w-64 min-h-screen bg-[#13151f] border-r border-[#1e2133] flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1e2133]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <BarChart2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">QUANT SPORTS</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              activeTab === id
                ? 'bg-violet-600/20 text-violet-400 border border-violet-600/30'
                : 'text-slate-400 hover:bg-[#1e2133] hover:text-slate-200'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[#1e2133] space-y-2">
        <button
          onClick={onRefresh}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-[#1e2133] hover:text-slate-200 transition-all"
        >
          <RefreshCw size={16} />
          Refresh Data
        </button>
        {lastUpdated && (
          <p className="text-[10px] text-slate-600 text-center px-2">
            Updated {lastUpdated}
          </p>
        )}
      </div>
    </aside>
  )
}
