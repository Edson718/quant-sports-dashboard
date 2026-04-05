import { useState, useCallback } from 'react'
import { Menu } from 'lucide-react'
import './index.css'
import Sidebar from './components/Sidebar'
import OverviewPanel from './components/OverviewPanel'
import PredictionsPanel from './components/PredictionsPanel'
import MatchesPanel from './components/MatchesPanel'
import BankrollPanel from './components/BankrollPanel'
import EvaluationPanel from './components/EvaluationPanel'

const panels = {
  overview: OverviewPanel,
  predictions: PredictionsPanel,
  matches: MatchesPanel,
  bankroll: BankrollPanel,
  evaluation: EvaluationPanel,
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
    setLastUpdated(new Date().toLocaleTimeString())
  }, [])

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab)
    setSidebarOpen(false)
  }, [])

  const Panel = panels[activeTab] || OverviewPanel

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onRefresh={handleRefresh}
        lastUpdated={lastUpdated}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[#1e2133] bg-[#13151f] sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1e2133] transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">Q</span>
            </div>
            <span className="text-sm font-bold text-white tracking-wide">QUANT SPORTS</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Panel key={`${activeTab}-${refreshKey}`} />
        </div>
      </main>
    </div>
  )
}
