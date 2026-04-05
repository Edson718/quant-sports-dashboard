import { useState, useCallback } from 'react'
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

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
    setLastUpdated(new Date().toLocaleTimeString())
  }, [])

  const Panel = panels[activeTab] || OverviewPanel

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
        lastUpdated={lastUpdated}
      />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Panel key={`${activeTab}-${refreshKey}`} />
        </div>
      </main>
    </div>
  )
}
